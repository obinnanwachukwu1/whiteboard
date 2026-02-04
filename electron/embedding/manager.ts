// electron/embedding/manager.ts
import * as ort from 'onnxruntime-node'
import fs from 'fs'
import { EventEmitter } from 'events'
import { ModelManager, DownloadProgress } from './modelManager'
import { VectorStore, VectorEntry, SearchResult, ContentType, VectorMetadata, type SearchOptions } from './vectorStore'
import { stripHtml, hashContent, truncateText, meanPooling, normalizeVector } from './utils'

interface TokenizerOutput {
  input_ids: number[][]
  attention_mask: number[][]
}

export interface IndexableItem {
  id: string
  type: ContentType
  courseId: string
  courseName: string
  title: string
  content: string  // Raw HTML or text
  url?: string
}

export interface EmbeddingStatus {
  ready: boolean
  modelDownloaded: boolean
  itemCount: number
  memoryUsedMB: number
  memoryLimitMB: number
}

const EMBEDDING_DIM = 384
const MAX_SEQ_LENGTH = 256  // MiniLM max sequence length
const SNIPPET_LENGTH = 300
const BATCH_DELAY_MS = 100  // Delay between batches to reduce CPU pressure

export class EmbeddingManager extends EventEmitter {
  private modelManager: ModelManager
  private vectorStore: VectorStore
  private session: ort.InferenceSession | null = null
  private tokenizerData: any = null
  private isInitializing = false
  private isReady = false
  private paused = false
  private pausePromise: Promise<void> | null = null
  private pauseResolve: (() => void) | null = null

  constructor() {
    super()
    this.modelManager = new ModelManager()
    this.vectorStore = new VectorStore(300) // 300MB limit

    // Forward download progress events
    this.modelManager.on('download-progress', (progress: DownloadProgress) => {
      this.emit('download-progress', progress)
    })
  }

  /**
   * Initialize the embedding manager (download model if needed, load ONNX).
   */
  async initialize(): Promise<void> {
    if (this.isReady) {
      console.log('[EmbeddingManager] Already initialized')
      return
    }

    if (this.isInitializing) {
      console.log('[EmbeddingManager] Initialization in progress, waiting...')
      return new Promise((resolve) => {
        this.once('ready', resolve)
      })
    }

    this.isInitializing = true
    console.log('[EmbeddingManager] Initializing...')

    try {
      // Load vector store from disk
      await this.vectorStore.load()

      // Ensure model is downloaded
      await this.modelManager.ensureModel((progress) => {
        this.emit('download-progress', progress)
      })

      // Load ONNX model
      const modelPath = this.modelManager.getOnnxModelPath()
      if (!fs.existsSync(modelPath)) {
        throw new Error(`ONNX model not found at ${modelPath}`)
      }

      console.log('[EmbeddingManager] Loading ONNX model...')

      // Prefer an accelerator EP where available, with CPU fallback.
      // - macOS: CoreML (Neural Engine/GPU)
      // - Windows: DirectML (GPU via D3D12 across NVIDIA/AMD/Intel)
      // - Linux: typically CUDA/ROCm/OpenVINO depending on build; if not bundled, CPU.
      const supportedBackends = (() => {
        try {
          return ort.listSupportedBackends?.().map((b) => b.name) ?? []
        } catch {
          return []
        }
      })()
      const supported = new Set(supportedBackends)

      // Optional override for debugging/experiments. Examples: "dml", "coreml", "cuda", "cpu".
      const requested = (process.env.WB_ONNX_EP || '').trim().toLowerCase()

      const executionProviders: string[] = []
      if (requested) {
        if (requested === 'cpu' || supported.has(requested)) {
          executionProviders.push(requested)
        } else {
          console.warn(
            `[EmbeddingManager] Requested EP "${requested}" not available; supported: ${supportedBackends.join(', ') || '(unknown)'}`,
          )
        }
      }

      if (!executionProviders.length) {
        if (process.platform === 'darwin' && supported.has('coreml')) {
          executionProviders.push('coreml')
        } else if (process.platform === 'win32' && supported.has('dml')) {
          executionProviders.push('dml')
        }
      }

      // Always keep CPU as a safe fallback.
      if (!executionProviders.includes('cpu')) executionProviders.push('cpu')

      console.log(`[EmbeddingManager] Using execution providers: ${executionProviders.join(', ')}`)

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders,
        graphOptimizationLevel: 'all',
        // Limit CPU threads when falling back to CPU
        intraOpNumThreads: 2,
        interOpNumThreads: 1,
      })
      console.log('[EmbeddingManager] ONNX model loaded')

      // Load tokenizer
      const tokenizerPath = this.modelManager.getTokenizerPath()
      if (!fs.existsSync(tokenizerPath)) {
        throw new Error(`Tokenizer not found at ${tokenizerPath}`)
      }

      console.log('[EmbeddingManager] Loading tokenizer...')
      const tokenizerJson = fs.readFileSync(tokenizerPath, 'utf-8')
      this.tokenizerData = JSON.parse(tokenizerJson)
      console.log('[EmbeddingManager] Tokenizer loaded')

      this.isReady = true
      this.isInitializing = false
      this.emit('ready')
      console.log('[EmbeddingManager] Initialization complete')
    } catch (error) {
      this.isInitializing = false
      console.error('[EmbeddingManager] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Check if the manager is ready to process embeddings.
   */
  get ready(): boolean {
    return this.isReady
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return
    this.paused = paused
    if (!paused && this.pauseResolve) {
      this.pauseResolve()
      this.pauseResolve = null
      this.pausePromise = null
    }
  }

  isPaused(): boolean {
    return this.paused
  }

  private async waitIfPaused(): Promise<void> {
    if (!this.paused) return
    if (!this.pausePromise) {
      this.pausePromise = new Promise((resolve) => {
        this.pauseResolve = resolve
      })
    }
    await this.pausePromise
  }

  async waitUntilResumed(): Promise<void> {
    await this.waitIfPaused()
  }

  /**
   * Get the current status.
   */
  getStatus(): EmbeddingStatus {
    const memoryUsed = this.vectorStore.getMemoryUsage()
    return {
      ready: this.isReady,
      modelDownloaded: this.modelManager.isModelDownloaded(),
      itemCount: this.vectorStore.size,
      memoryUsedMB: Math.round(memoryUsed / 1024 / 1024 * 10) / 10,
      memoryLimitMB: 300,
    }
  }

  /**
   * Tokenize text using the loaded tokenizer.
   * This is a simplified tokenizer that handles basic cases.
   */
  private tokenize(texts: string[]): TokenizerOutput {
    const vocab = this.tokenizerData.model.vocab as Record<string, number>
    const unkTokenId = vocab['[UNK]'] ?? 0
    const clsTokenId = vocab['[CLS]'] ?? 101
    const sepTokenId = vocab['[SEP]'] ?? 102
    const padTokenId = vocab['[PAD]'] ?? 0

    const allInputIds: number[][] = []
    const allAttentionMasks: number[][] = []

    for (const text of texts) {
      // Simple word-piece tokenization (lowercase, split on whitespace and punctuation)
      const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' $& ')
      const words = normalized.split(/\s+/).filter(Boolean)
      
      const tokenIds: number[] = [clsTokenId]
      
        for (const word of words) {
        // Try to find the word in vocab
        if (typeof vocab[word] === 'number') {
          tokenIds.push(vocab[word])
        } else {
          // Try word-piece: split into subwords
          let remaining = word
          while (remaining.length > 0) {
            let found = false
            for (let end = remaining.length; end > 0; end--) {
              const piece = tokenIds.length > 1 ? '##' + remaining.substring(0, end) : remaining.substring(0, end)
              if (typeof vocab[piece] === 'number') {
                tokenIds.push(vocab[piece])
                remaining = remaining.substring(end)
                found = true
                break
              }
            }
            if (!found) {
              // Unknown token
              tokenIds.push(unkTokenId)
              break
            }
            
            // Immediate length check inside subword loop
            if (tokenIds.length >= MAX_SEQ_LENGTH - 1) {
              break
            }
          }
        }
        
        // Check length limit (leave room for [SEP])
        if (tokenIds.length >= MAX_SEQ_LENGTH - 1) {
          break
        }
      }

      // Hard truncation to ensure we never exceed limit even if the loop logic slipped
      if (tokenIds.length > MAX_SEQ_LENGTH - 1) {
        tokenIds.length = MAX_SEQ_LENGTH - 1
      }

      tokenIds.push(sepTokenId)

      // Pad to max length
      const paddingLength = MAX_SEQ_LENGTH - tokenIds.length
      const attentionMask = new Array(tokenIds.length).fill(1)
      
      for (let i = 0; i < paddingLength; i++) {
        tokenIds.push(padTokenId)
        attentionMask.push(0)
      }

      allInputIds.push(tokenIds)
      allAttentionMasks.push(attentionMask)
    }

    return {
      input_ids: allInputIds,
      attention_mask: allAttentionMasks,
    }
  }

  /**
   * Generate embedding for a single text.
   */
  async embed(text: string): Promise<Float32Array> {
    const embeddings = await this.embedBatch([text])
    return embeddings[0]
  }

  /**
   * Generate embeddings for multiple texts (batch processing).
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.isReady || !this.session) {
      throw new Error('EmbeddingManager not initialized')
    }

    if (texts.length === 0) {
      return []
    }

    // Tokenize
    const { input_ids, attention_mask } = this.tokenize(texts)

    // Create ONNX tensors
    const batchSize = texts.length
    const inputIdsTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(input_ids.flat().map(BigInt)),
      [batchSize, MAX_SEQ_LENGTH]
    )
    const attentionMaskTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(attention_mask.flat().map(BigInt)),
      [batchSize, MAX_SEQ_LENGTH]
    )
    const tokenTypeIdsTensor = new ort.Tensor(
      'int64',
      new BigInt64Array(batchSize * MAX_SEQ_LENGTH).fill(0n),
      [batchSize, MAX_SEQ_LENGTH]
    )

    // Run inference
    const feeds = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
      token_type_ids: tokenTypeIdsTensor,
    }

    const results = await this.session.run(feeds)
    
    // Get the last hidden state (token embeddings)
    const lastHiddenState = results['last_hidden_state']
    if (!lastHiddenState) {
      throw new Error('Model output missing last_hidden_state')
    }

    const data = lastHiddenState.data as Float32Array
    const embeddings: Float32Array[] = []

    // Apply mean pooling for each text in the batch
    for (let i = 0; i < batchSize; i++) {
      const startIdx = i * MAX_SEQ_LENGTH * EMBEDDING_DIM
      const tokenEmbeddings = data.subarray(startIdx, startIdx + MAX_SEQ_LENGTH * EMBEDDING_DIM)
      const mask = BigInt64Array.from(attention_mask[i].map(BigInt))
      
      const pooled = meanPooling(tokenEmbeddings, mask, EMBEDDING_DIM)
      const normalized = normalizeVector(pooled)
      embeddings.push(normalized)
    }

    return embeddings
  }

  /**
   * Index multiple items for search.
   */
  async index(items: IndexableItem[]): Promise<{ indexed: number; skipped: number }> {
    if (!this.isReady) {
      await this.initialize()
    }

    await this.waitIfPaused()

    if (items.length === 0) {
      console.log('[EmbeddingManager] No items to index (skipping prune/save)')
      return { indexed: 0, skipped: 0 }
    }

    let indexed = 0
    let skipped = 0

    // Process in batches with throttling to reduce CPU/energy usage
    const batchSize = 6  // Reduced from 16 for lower peak CPU usage
    for (let i = 0; i < items.length; i += batchSize) {
      await this.waitIfPaused()
      // Add delay between batches to let CPU cool down
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }

      const batch = items.slice(i, i + batchSize)
      const toEmbed: { item: IndexableItem; text: string; hash: string }[] = []

      for (const item of batch) {
        // Prepare text for embedding
        const cleanContent = stripHtml(item.content)
        const text = `${item.title} ${cleanContent}`.trim()
        const hash = hashContent(text)

        // Check if needs re-indexing
        const existingHash = this.vectorStore.getContentHash(item.id)
        if (existingHash === hash) {
          skipped++
          continue
        }

        toEmbed.push({ item, text, hash })
      }

      if (toEmbed.length === 0) continue

      // Generate embeddings for batch
      await this.waitIfPaused()
      const texts = toEmbed.map(({ text }) => text)
      const embeddings = await this.embedBatch(texts)

      // Store embeddings
      for (let j = 0; j < toEmbed.length; j++) {
        const { item, hash } = toEmbed[j]
        const embedding = embeddings[j]

        const entry: VectorEntry = {
          id: item.id,
          embedding,
          metadata: {
            type: item.type,
            courseId: item.courseId,
            courseName: item.courseName,
            title: item.title,
            snippet: truncateText(stripHtml(item.content), SNIPPET_LENGTH),
            url: item.url,
            contentHash: hash,
          },
        }

        this.vectorStore.add(entry)
        indexed++
      }
    }

    // Prune entries that no longer exist in the current dataset
    // (prevents stale results when our indexing strategy changes)
    // BUT: Do not prune file chunks, as they are managed separately
    const currentIds = new Set(items.map(i => i.id))
    let removed = 0
    for (const id of this.vectorStore.getIds()) {
      // Skip pruning for file chunks
      if (id.startsWith('file:')) {
        continue
      }
      
      if (!currentIds.has(id)) {
        if (this.vectorStore.remove(id)) removed++
      }
    }

    // Save to disk after indexing
    if (indexed > 0 || removed > 0) {
      await this.vectorStore.save()
    }

    console.log(`[EmbeddingManager] Indexed ${indexed}, skipped ${skipped}, removed ${removed}`)
    return { indexed, skipped }
  }

  /**
   * Search for similar items.
   */
  async search(query: string, k = 10, opts: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isReady) {
      await this.initialize()
    }

    const queryEmbedding = await this.embed(query)
    return this.vectorStore.search(queryEmbedding, k, { dedupe: true, ...opts })
  }

  /**
   * Remove an item from the index.
   */
  remove(id: string): boolean {
    return this.vectorStore.remove(id)
  }

  /**
   * Clear all indexed items.
   */
  async clear(): Promise<void> {
    this.vectorStore.clear()
    await this.vectorStore.save()
  }

  /**
   * Remove all entries for a course (used when course is unpinned).
   */
  async removeByCourseId(courseId: string): Promise<number> {
    const removed = this.vectorStore.removeByCourseId(courseId)
    if (removed > 0) {
      await this.vectorStore.save()
    }
    return removed
  }

  /**
   * Remove all entries for a file (used before re-indexing).
   */
  removeByFileId(fileId: string): number {
    return this.vectorStore.removeByFileId(fileId)
  }

  /**
   * Get storage statistics.
   */
  getStorageStats(): {
    totalEntries: number
    totalBytes: number
    byCourse: Record<string, { entries: number; bytes: number }>
    byType: Record<string, { entries: number; bytes: number }>
  } {
    return this.vectorStore.getStorageStats()
  }

  /**
   * Index file chunks (incremental, does NOT prune other entries).
   * Used for file content indexing.
   */
  async indexFileChunks(
    chunks: Array<{ id: string; text: string; metadata: VectorMetadata }>
  ): Promise<{ indexed: number; skipped: number }> {
    if (!this.isReady) {
      await this.initialize()
    }

    let indexed = 0
    let skipped = 0

    // Process in batches with throttling to reduce CPU/energy usage
    const batchSize = 6  // Reduced from 16 for lower peak CPU usage
    for (let i = 0; i < chunks.length; i += batchSize) {
      await this.waitIfPaused()
      // Add delay between batches to let CPU cool down
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }

      const batch = chunks.slice(i, i + batchSize)
      const toEmbed: typeof batch = []

      for (const chunk of batch) {
        // Check if already indexed with same content
        const existingHash = this.vectorStore.getContentHash(chunk.id)
        if (existingHash === chunk.metadata.contentHash) {
          skipped++
          continue
        }
        toEmbed.push(chunk)
      }

      if (toEmbed.length === 0) continue

      // Generate embeddings for batch
      await this.waitIfPaused()
      const texts = toEmbed.map(c => c.text)
      const embeddings = await this.embedBatch(texts)

      // Store embeddings
      const entries: VectorEntry[] = []
      for (let j = 0; j < toEmbed.length; j++) {
        const chunk = toEmbed[j]
        entries.push({
          id: chunk.id,
          embedding: embeddings[j],
          metadata: chunk.metadata,
        })
        indexed++
      }

      // Add batch to store (no pruning)
      this.vectorStore.addBatch(entries)
    }

    // Save to disk after indexing
    if (indexed > 0) {
      await this.vectorStore.save()
    }

    console.log(`[EmbeddingManager] Indexed ${indexed} file chunks, skipped ${skipped}`)
    return { indexed, skipped }
  }

  /**
   * Shutdown the manager (save and cleanup).
   */
  async shutdown(): Promise<void> {
    console.log('[EmbeddingManager] Shutting down...')
    await this.vectorStore.save()
    
    if (this.session) {
      // ONNX session doesn't have explicit dispose in Node.js
      this.session = null
    }
    
    this.isReady = false
    console.log('[EmbeddingManager] Shutdown complete')
  }
}
