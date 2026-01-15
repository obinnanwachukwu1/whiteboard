// electron/embedding/modelManager.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { EventEmitter } from 'events'

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',  // Quantized model is smaller (~22MB)
]

// HuggingFace CDN base URL
const HF_CDN_BASE = 'https://huggingface.co'

export interface DownloadProgress {
  file: string
  downloaded: number
  total: number
  percent: number
}

export class ModelManager extends EventEmitter {
  private modelDir: string
  private isDownloading = false

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.modelDir = path.join(userDataPath, 'models', 'all-MiniLM-L6-v2')
  }

  /**
   * Get the path to the model directory.
   */
  getModelPath(): string {
    return this.modelDir
  }

  /**
   * Get the path to the ONNX model file.
   */
  getOnnxModelPath(): string {
    return path.join(this.modelDir, 'onnx', 'model_quantized.onnx')
  }

  /**
   * Get the path to the tokenizer file.
   */
  getTokenizerPath(): string {
    return path.join(this.modelDir, 'tokenizer.json')
  }

  /**
   * Check if the model is fully downloaded.
   */
  isModelDownloaded(): boolean {
    for (const file of MODEL_FILES) {
      const filePath = path.join(this.modelDir, file)
      if (!fs.existsSync(filePath)) {
        return false
      }
    }
    return true
  }

  /**
   * Ensure the model is downloaded. Downloads if not present.
   */
  async ensureModel(onProgress?: (progress: DownloadProgress) => void): Promise<string> {
    if (this.isModelDownloaded()) {
      console.log('[ModelManager] Model already downloaded')
      return this.modelDir
    }

    await this.downloadModel(onProgress)
    return this.modelDir
  }

  /**
   * Download the model files from HuggingFace.
   */
  async downloadModel(onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (this.isDownloading) {
      throw new Error('Download already in progress')
    }

    this.isDownloading = true
    console.log('[ModelManager] Starting model download...')

    try {
      // Create model directory
      fs.mkdirSync(path.join(this.modelDir, 'onnx'), { recursive: true })

      // Download each file
      for (let i = 0; i < MODEL_FILES.length; i++) {
        const file = MODEL_FILES[i]
        const filePath = path.join(this.modelDir, file)
        
        // Skip if already exists
        if (fs.existsSync(filePath)) {
          console.log(`[ModelManager] File already exists: ${file}`)
          continue
        }

        const url = `${HF_CDN_BASE}/${MODEL_ID}/resolve/main/${file}`
        console.log(`[ModelManager] Downloading ${file}...`)
        
        await this.downloadFile(url, filePath, (downloaded, total) => {
          const progress: DownloadProgress = {
            file,
            downloaded,
            total,
            percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          }
          this.emit('download-progress', progress)
          onProgress?.(progress)
        })
        
        console.log(`[ModelManager] Downloaded ${file}`)
      }

      console.log('[ModelManager] Model download complete')
    } finally {
      this.isDownloading = false
    }
  }

  /**
   * Download a single file with progress tracking.
   */
  private downloadFile(
    url: string,
    destPath: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = (currentUrl: string, redirectCount = 0) => {
        if (redirectCount > 10) {
          reject(new Error('Too many redirects'))
          return
        }

        console.log(`[ModelManager] Fetching: ${currentUrl.substring(0, 100)}...`)
        
        // Parse the current URL to get the base for relative redirects
        const parsedUrl = new URL(currentUrl)
        
        https.get(currentUrl, (response) => {
          // Handle redirects (301, 302, 303, 307, 308)
          const statusCode = response.statusCode || 0
          if (statusCode >= 300 && statusCode < 400) {
            let redirectUrl = response.headers.location
            if (redirectUrl) {
              // Consume response body before following redirect
              response.resume()
              
              // Handle relative redirect URLs
              if (redirectUrl.startsWith('/')) {
                redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`
              } else if (!redirectUrl.startsWith('http')) {
                // Relative path without leading slash
                const basePath = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/'))
                redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${basePath}/${redirectUrl}`
              }
              
              console.log(`[ModelManager] Redirect ${statusCode} -> ${redirectUrl.substring(0, 80)}...`)
              request(redirectUrl, redirectCount + 1)
              return
            }
          }

          if (statusCode !== 200) {
            response.resume()
            reject(new Error(`Failed to download: HTTP ${statusCode}`))
            return
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedSize = 0

          // Ensure parent directory exists
          const parentDir = path.dirname(destPath)
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true })
          }

          const fileStream = fs.createWriteStream(destPath)

          response.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length
            onProgress?.(downloadedSize, totalSize)
          })

          response.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            console.log(`[ModelManager] Downloaded ${Math.round(downloadedSize / 1024)}KB`)
            resolve()
          })

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {}) // Clean up partial file
            reject(err)
          })
        }).on('error', (err) => {
          console.error(`[ModelManager] Request error:`, err.message)
          reject(err)
        })
      }

      request(url)
    })
  }

  /**
   * Delete the model files (for cleanup/re-download).
   */
  deleteModel(): void {
    if (fs.existsSync(this.modelDir)) {
      fs.rmSync(this.modelDir, { recursive: true, force: true })
      console.log('[ModelManager] Model deleted')
    }
  }

  /**
   * Get the total size of downloaded model files.
   */
  getModelSize(): number {
    let totalSize = 0
    for (const file of MODEL_FILES) {
      const filePath = path.join(this.modelDir, file)
      if (fs.existsSync(filePath)) {
        totalSize += fs.statSync(filePath).size
      }
    }
    return totalSize
  }
}
