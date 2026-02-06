// electron/ai/manager.ts
import { spawn, ChildProcess } from 'child_process'
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
const STATUS_PROBE_TIMEOUT_MS = 1200
const SOCKET_PROBE_TIMEOUT_MS = 8000

export type AIAvailability = {
  status: 'available' | 'unsupported' | 'disabled' | 'error'
  detail?: string
}

export class AIManager {
  private process: ChildProcess | null = null
  private socketPath: string
  private binaryPath: string = ''
  private isShuttingDown = false
  private isEnabled = false
  private restartAttempts = 0
  private isReady = false
  private activeRequests: Map<string, http.ClientRequest> = new Map()
  private availabilityCache:
    | {
        checkedAt: number
        status: AIAvailability
      }
    | null = null
  private availabilityPromise: Promise<AIAvailability> | null = null

  constructor() {
    // Socket path will be initialized in start() once we have app.getPath('temp')
    this.socketPath = ''
    // Register IPC handler immediately
    this.setupIPC()
  }

  private resolveBinaryPath() {
    const isDev = !app.isPackaged
    const binaryName = 'afmbridge-server'
    return isDev
      ? path.join(process.cwd(), 'resources', 'bin', binaryName)
      : path.join(process.resourcesPath, 'bin', binaryName)
  }

  public async getAvailability(force = false): Promise<AIAvailability> {
    const now = Date.now()
    if (!force && this.availabilityCache && now - this.availabilityCache.checkedAt < 30_000) {
      return this.availabilityCache.status
    }
    if (this.availabilityPromise) return this.availabilityPromise

    this.availabilityPromise = this.checkAvailability().finally(() => {
      this.availabilityPromise = null
    })

    const status = await this.availabilityPromise
    this.availabilityCache = { checkedAt: Date.now(), status }
    return status
  }

  private parseAvailabilityReason(output: string): string | null {
    const match = output.match(/unavailable:\s*([^\n\r]+)/i)
    return match ? match[1].trim() : null
  }

  private isNotEnabledReason(reason: string): boolean {
    const lower = reason.toLowerCase()
    return (
      lower.includes('notenabled') ||
      lower.includes('not enabled') ||
      lower.includes('disabled') ||
      lower.includes('not_enabled')
    )
  }

  private async checkAvailability(): Promise<AIAvailability> {
    if (process.platform !== 'darwin') {
      return { status: 'unsupported', detail: 'non-mac' }
    }

    const binaryPath = this.resolveBinaryPath()
    if (!fs.existsSync(binaryPath)) {
      return { status: 'unsupported', detail: 'missing_binary' }
    }

    try {
      fs.chmodSync(binaryPath, 0o755)
    } catch {}

    const statusResult = await this.checkAvailabilityViaStatus(binaryPath)
    if (statusResult) return statusResult

    // Fallback for older binaries that don't support --status.
    return this.checkAvailabilityViaSocket(binaryPath)
  }

  private async checkAvailabilityViaStatus(binaryPath: string): Promise<AIAvailability | null> {
    return new Promise<AIAvailability | null>((resolve) => {
      let settled = false
      let stdout = ''
      let stderr = ''

      const child = spawn(binaryPath, ['--status'])

      const finish = (result: AIAvailability | null) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve(result)
      }

      child.stdout?.on('data', (data) => {
        stdout += String(data)
      })

      child.stderr?.on('data', (data) => {
        stderr += String(data)
      })

      child.on('error', (err) => {
        finish({ status: 'error', detail: err.message })
      })

      child.on('exit', (code) => {
        const raw = stdout.trim()
        if (raw) {
          try {
            const json = JSON.parse(raw)
            const status = String(json?.status || '').toLowerCase()
            const detail = typeof json?.detail === 'string' ? json.detail : undefined

            if (status === 'available') {
              finish({ status: 'available', detail })
              return
            }
            if (status === 'unavailable') {
              if (detail && this.isNotEnabledReason(detail)) {
                finish({ status: 'disabled', detail })
              } else {
                finish({ status: 'unsupported', detail })
              }
              return
            }
            if (status === 'unknown') {
              finish({ status: 'error', detail: detail || 'unknown' })
              return
            }
          } catch {
            // Fall through to fallback.
          }
        }

        if (code === 0 && !raw) {
          finish({ status: 'available' })
          return
        }
        if (code === 2 && stderr) {
          const reason = this.parseAvailabilityReason(stderr) || stderr.trim()
          if (reason && this.isNotEnabledReason(reason)) {
            finish({ status: 'disabled', detail: reason })
          } else if (reason) {
            finish({ status: 'unsupported', detail: reason })
          } else {
            finish({ status: 'unsupported', detail: 'unavailable' })
          }
          return
        }

        finish(null)
      })

      const timeout = setTimeout(() => {
        // Some systems can take longer to respond to --status on first probe.
        // Return null so we still try the socket-based fallback check.
        finish(null)
      }, STATUS_PROBE_TIMEOUT_MS)
    })
  }

  private async checkAvailabilityViaSocket(binaryPath: string): Promise<AIAvailability> {
    const shortId = randomUUID().split('-')[0]
    const socketPath = path.join('/tmp', `wb-ai-check-${shortId}.sock`)

    return new Promise<AIAvailability>((resolve) => {
      let settled = false
      let stderr = ''
      let stdout = ''

      const child = spawn(binaryPath, ['--socket', socketPath, '--quiet'])

      const finish = (result: AIAvailability) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      const cleanup = () => {
        if (!child.killed) {
          try {
            child.kill('SIGINT')
          } catch {}
        }
        setTimeout(() => {
          if (!child.killed) {
            try {
              child.kill('SIGKILL')
            } catch {}
          }
        }, 200)

        if (fs.existsSync(socketPath)) {
          try {
            fs.unlinkSync(socketPath)
          } catch {}
        }
        clearTimeout(timeout)
        clearInterval(socketCheck)
      }

      child.stderr?.on('data', (data) => {
        stderr += String(data)
      })

      child.stdout?.on('data', (data) => {
        stdout += String(data)
      })

      child.on('error', (err) => {
        finish({ status: 'error', detail: err.message })
      })

      child.on('exit', (code) => {
        if (settled) return
        const output = `${stderr}\n${stdout}`.trim()
        const reason = this.parseAvailabilityReason(output) || output
        if (code === 2 || reason) {
          if (reason && this.isNotEnabledReason(reason)) {
            finish({ status: 'disabled', detail: reason })
          } else if (reason) {
            finish({ status: 'unsupported', detail: reason })
          } else {
            finish({ status: 'unsupported', detail: 'unavailable' })
          }
          return
        }
        if (code === 0) {
          finish({ status: 'available' })
          return
        }
        finish({ status: 'error', detail: output || `exit_${code ?? 'unknown'}` })
      })

      const socketCheck = setInterval(() => {
        if (fs.existsSync(socketPath)) {
          finish({ status: 'available' })
        }
      }, 50)

      const timeout = setTimeout(() => {
        finish({ status: 'error', detail: 'timeout' })
      }, SOCKET_PROBE_TIMEOUT_MS)
    })
  }

  public async start(enabled: boolean) {
    if (!enabled) {
      console.log('[AI] Disabled by settings.')
      return
    }

    const availability = await this.getAvailability()
    if (availability.status !== 'available') {
      console.log(`[AI] Not available: ${availability.status}${availability.detail ? ` (${availability.detail})` : ''}.`)
      return
    }

    this.isEnabled = true

    // Determine path to binary
    this.binaryPath = this.resolveBinaryPath()

    // Use /tmp with a short name to avoid "unixDomainSocketPathTooLong" (limit is ~104 chars)
    // app.getPath('temp') on macOS can be very long (/var/folders/...)
    const shortId = randomUUID().split('-')[0]
    this.socketPath = path.join('/tmp', `wb-${shortId}.sock`)

    await this.startProcess()
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
    ipcMain.handle('ai:availability', async (_evt, opts?: { force?: boolean }) => {
      try {
        const data = await this.getAvailability(Boolean(opts?.force))
        return { ok: true, data }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    })

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
