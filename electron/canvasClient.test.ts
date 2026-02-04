import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getName: () => 'Whiteboard',
    getVersion: () => '1.0.0',
    getPath: () => '/tmp',
  },
}))

vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(),
    getPassword: vi.fn(async () => null),
    deletePassword: vi.fn(),
  },
}))

describe('CanvasClient resolveModuleItemUrl', () => {
  const token = 't123'
  const baseUrl = 'https://canvas.example.edu'

  const fetchCalls: Array<{ url: string; headers?: Record<string, string> }> = []

  beforeEach(() => {
    fetchCalls.length = 0
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not follow cross-origin redirects with auth', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, opts: any) => {
        fetchCalls.push({ url, headers: opts?.headers })
        if (url === `${baseUrl}/api/v1/modules/items/1`) {
          return new Response(null, {
            status: 302,
            headers: { location: 'https://evil.example/redirect' },
          })
        }
        return new Response(null, { status: 200 })
      }),
    )

    const { CanvasClient } = await import('./canvasClient')
    const client = new CanvasClient({ token, baseUrl })
    const finalUrl = await client.resolveModuleItemUrl('/modules/items/1')

    expect(finalUrl).toBe('https://evil.example/redirect')
    expect(fetchCalls.length).toBe(1)
    expect(fetchCalls[0].headers?.Authorization).toBe(`Bearer ${token}`)
  })

  it('keeps auth on same-origin redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, opts: any) => {
        fetchCalls.push({ url, headers: opts?.headers })
        if (url === `${baseUrl}/api/v1/modules/items/1`) {
          return new Response(null, {
            status: 302,
            headers: { location: `${baseUrl}/api/v1/modules/items/2` },
          })
        }
        return new Response(null, { status: 200 })
      }),
    )

    const { CanvasClient } = await import('./canvasClient')
    const client = new CanvasClient({ token, baseUrl })
    const finalUrl = await client.resolveModuleItemUrl('/modules/items/1')

    expect(finalUrl).toBe(`${baseUrl}/api/v1/modules/items/2`)
    expect(fetchCalls.length).toBe(2)
    expect(fetchCalls[0].headers?.Authorization).toBe(`Bearer ${token}`)
    expect(fetchCalls[1].headers?.Authorization).toBe(`Bearer ${token}`)
  })
})

describe('initCanvas baseUrl validation', () => {
  afterEach(() => {
    delete process.env.WB_ALLOW_INSECURE
  })

  it('rejects non-https URLs (non-localhost)', async () => {
    const { initCanvas } = await import('./canvasClient')
    await expect(
      initCanvas({ token: 't', baseUrl: 'http://evil.example' }),
    ).rejects.toThrow('https://')
  })

  it('accepts https URLs', async () => {
    const { initCanvas } = await import('./canvasClient')
    await expect(
      initCanvas({ token: 't', baseUrl: 'https://canvas.example.edu' }),
    ).resolves.toBeTruthy()
  })

  it('accepts localhost http URLs', async () => {
    const { initCanvas } = await import('./canvasClient')
    await expect(
      initCanvas({ token: 't', baseUrl: 'http://localhost:3000' }),
    ).resolves.toBeTruthy()
  })
})
