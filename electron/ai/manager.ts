// electron/ai/manager.ts
import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app, ipcMain } from 'electron'
import http from 'http'
import { randomUUID } from 'crypto'

const REQUEST_TIMEOUT_MS = 30000 // 30 second timeout
const MAX_RESTART_ATTEMPTS = 3
const RESTART_DELAY_MS = 2000
const READINESS_CHECK_INTERVAL_MS = 500
const READINESS_TIMEOUT_MS = 10000

export class AIManager {
  private process: ChildProcess | null = null
  private socketPath: string
  private binaryPath: string = ''
  private isShuttingDown = false
  private isEnabled = false
  private restartAttempts = 0
  private isReady = false
  private activeRequests: Map<string, http.ClientRequest> = new Map()

  constructor() {
    // Socket path will be initialized in start() once we have app.getPath('temp')
    this.socketPath = ''
    // Register IPC handler immediately
    this.setupIPC()
  }

  private isSupported(): boolean {
    if (process.platform !== 'darwin') return false

    try {
      const productVersion = execSync('sw_vers -productVersion').toString().trim()
      const [major, minor] = productVersion.split('.').map(Number)

      if (major < 26) return false
      if (major === 26 && minor < 1) return false

      return true
    } catch (e) {
      console.error('[AI] Failed to check macOS version:', e)
      return false
    }
  }

  public start(enabled: boolean) {
    if (!enabled) {
      console.log('[AI] Disabled by settings.')
      return
    }

    if (!this.isSupported()) {
      console.log('[AI] Not supported on this platform/version.')
      return
    }

    this.isEnabled = true

    // Determine path to binary
    const isDev = !app.isPackaged
    const binaryName = 'afmbridge-server'

    if (isDev) {
      this.binaryPath = path.join(process.cwd(), 'resources', 'bin', binaryName)
    } else {
      this.binaryPath = path.join(process.resourcesPath, 'bin', binaryName)
    }

    // Use /tmp with a short name to avoid "unixDomainSocketPathTooLong" (limit is ~104 chars)
    // app.getPath('temp') on macOS can be very long (/var/folders/...)
    const shortId = randomUUID().split('-')[0]
    this.socketPath = path.join('/tmp', `wb-${shortId}.sock`)

    this.startProcess()
  }

  private async startProcess() {
    if (this.isShuttingDown || !this.isEnabled) return

    this.isReady = false

    // Ensure binary is executable (especially in packaged app)
    try {
      if (fs.existsSync(this.binaryPath)) {
        fs.chmodSync(this.binaryPath, 0o755)
      }
    } catch (e) {
      console.warn('[AI] Failed to ensure binary is executable:', e)
    }

    console.log(`[AI] Starting AI Server at: ${this.binaryPath}`)
    console.log(`[AI] Socket Path: ${this.socketPath}`)

    // Clean up socket if it exists
    if (fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath)
      } catch (_e) {
        // ignore
      }
    }

    try {
      this.process = spawn(this.binaryPath, ['--socket', this.socketPath])

      this.process.stdout?.on('data', (data) => {
        console.log(`[AI Server]: ${data}`)
      })

      // Note: afmbridge-server writes all logs to stderr (common for servers)
      this.process.stderr?.on('data', (data) => {
        const msg = String(data).trim()
        if (msg.toLowerCase().includes('error') && !msg.includes('Completed')) {
          console.error(`[AI Server Error]: ${msg}`)
        } else {
          console.log(`[AI Server]: ${msg}`)
        }
      })

      this.process.on('close', (code) => {
        this.isReady = false
        if (!this.isShuttingDown) {
          console.log(`[AI Server] exited with code ${code}`)
          this.handleCrash()
        }
      })

      this.process.on('error', (err) => {
        console.error('[AI] Process error:', err)
        this.isReady = false
      })

      // Wait for the socket to be ready
      await this.waitForReady()
      this.restartAttempts = 0 // Reset on successful start
    } catch (error) {
      console.error('[AI] Failed to start server:', error)
      this.handleCrash()
    }
  }

  private async waitForReady(): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < READINESS_TIMEOUT_MS) {
      if (fs.existsSync(this.socketPath)) {
        // Try a simple health check
        try {
          await this.healthCheck()
          this.isReady = true
          console.log('[AI] Server is ready')
          return
        } catch {
          // Not ready yet, continue waiting
        }
      }
      await this.sleep(READINESS_CHECK_INTERVAL_MS)
    }

    console.warn('[AI] Server readiness timeout - proceeding anyway')
    this.isReady = true // Assume ready and let requests fail if not
  }

  private healthCheck(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: '/health',
          method: 'GET',
          timeout: 2000,
        },
        (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            // 404 is fine - means server is up but no /health endpoint
            resolve()
          } else {
            reject(new Error(`Health check failed: ${res.statusCode}`))
          }
          res.resume() // Drain the response
        },
      )

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Health check timeout'))
      })
      req.end()
    })
  }

  private async handleCrash() {
    if (this.isShuttingDown || !this.isEnabled) return

    this.restartAttempts++

    if (this.restartAttempts > MAX_RESTART_ATTEMPTS) {
      console.error(`[AI] Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Giving up.`)
      return
    }

    console.log(
      `[AI] Attempting restart ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS} in ${RESTART_DELAY_MS}ms...`,
    )
    await this.sleep(RESTART_DELAY_MS)

    if (!this.isShuttingDown) {
      this.startProcess()
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public stop() {
    this.isShuttingDown = true
    this.isReady = false

    if (this.process) {
      console.log('[AI] Stopping server...')
      this.process.kill('SIGINT')
      this.process = null
    }

    // Final cleanup of socket file
    if (fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath)
      } catch (_e) {
        // ignore
      }
    }
  }

  private setupIPC() {
    ipcMain.on('ai:chat-cancel', (_, { id }) => {
      this.cancelRequest(id)
    })

    ipcMain.handle('ai:chat', async (_event, req) => {
      // Check if process is running and ready
      if (!this.process || !this.isReady) {
        return { ok: false, error: 'AI features are disabled or not available.' }
      }

      const clampInt = (value: any, fallback: number, min: number, max: number) => {
        const n = Number(value)
        if (!Number.isFinite(n)) return fallback
        return Math.max(min, Math.min(max, Math.round(n)))
      }

      const {
        messages,
        max_tokens = 500,
        response_format,
        tools,
        tool_choice,
        temperature,
        top_p,
      } = (req as any) ?? {}

      const maxTokensSafe = clampInt(max_tokens, 500, 1, 1200)

      const payload: any = {
        model: 'ondevice',
        messages,
        max_tokens: maxTokensSafe,
        stream: false,
      }

      if (response_format) payload.response_format = response_format
      if (tools) payload.tools = tools
      if (tool_choice) payload.tool_choice = tool_choice
      if (typeof temperature === 'number') payload.temperature = temperature
      if (typeof top_p === 'number') payload.top_p = top_p

      return this.sendRequest(payload)
    })

    // Streaming IPC handler
    ipcMain.on('ai:chat-stream', async (event, { id, messages, max_tokens = 500 }) => {
      if (!this.process || !this.isReady) {
        event.sender.send('ai:stream:error', {
          id,
          error: 'AI features are disabled or not available.',
        })
        return
      }

      try {
        await this.streamRequest(
          id,
          {
            model: 'ondevice',
            messages,
            max_tokens,
            stream: true,
          },
          (chunk) => {
            event.sender.send('ai:stream:chunk', { id, content: chunk })
          },
        )

        event.sender.send('ai:stream:done', { id })
      } catch (error: any) {
        event.sender.send('ai:stream:error', { id, error: error.message || 'Unknown stream error' })
      }
    })
  }

  private cancelRequest(requestId: string) {
    const req = this.activeRequests.get(requestId)
    if (req) {
      req.destroy()
      this.activeRequests.delete(requestId)
      console.log(`[AI] Cancelled request ${requestId}`)
    }
  }

  private streamRequest(
    requestId: string,
    payload: any,
    onChunk: (content: string) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload)

      const options = {
        socketPath: this.socketPath,
        path: '/v1/chat/completions',
        method: 'POST',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }

      const req = http.request(options, (res) => {
        res.setEncoding('utf8')

        let buffer = ''

        res.on('data', (chunk) => {
          buffer += chunk

          // Process lines
          const lines = buffer.split('\n')
          // Keep the last partial line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const dataStr = trimmed.slice(6) // Remove 'data: '

            if (dataStr === '[DONE]') continue

            try {
              const json = JSON.parse(dataStr)
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                onChunk(content)
              }
            } catch (e) {
              // Ignore parse errors for partial chunks that might have slipped through
              console.warn('[AI Stream] Parse error:', e)
            }
          }
        })

        res.on('end', () => {
          this.activeRequests.delete(requestId)
          // Process any remaining buffer (unlikely to be valid if it didn't end with newline, but check)
          if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
            try {
              const json = JSON.parse(buffer.slice(6))
              const content = json.choices?.[0]?.delta?.content
              if (content) onChunk(content)
            } catch {}
          }
          resolve()
        })
      })

      this.activeRequests.set(requestId, req)

      req.on('timeout', () => {
        this.activeRequests.delete(requestId)
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.on('error', (e) => {
        this.activeRequests.delete(requestId)
        reject(e)
      })

      req.write(postData)
      req.end()
    })
  }

  private sendRequest(payload: any): Promise<{ ok: boolean; choices?: any[]; error?: any }> {
    return new Promise((resolve) => {
      const postData = JSON.stringify(payload)
      let resolved = false

      const options = {
        socketPath: this.socketPath,
        path: '/v1/chat/completions',
        method: 'POST',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }

      const req = http.request(options, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (resolved) return
          resolved = true

          try {
            const json = JSON.parse(data)
            // Wrap in standard response format
            if (json.choices) {
              resolve({ ok: true, choices: json.choices })
            } else if (json.error) {
              resolve({ ok: false, error: json.error })
            } else {
              resolve({ ok: true, ...json })
            }
          } catch (_e) {
            resolve({ ok: false, error: `Failed to parse response: ${data}` })
          }
        })
      })

      req.on('timeout', () => {
        if (resolved) return
        resolved = true
        req.destroy()
        console.error('[AI] Request timeout')
        resolve({ ok: false, error: 'Request timeout - the AI server took too long to respond.' })
      })

      req.on('error', (e) => {
        if (resolved) return
        resolved = true
        console.error(`[AI Request Error]: ${e.message}`)
        resolve({ ok: false, error: e.message })
      })

      req.write(postData)
      req.end()
    })
  }
}
