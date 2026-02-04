
import React, { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'
import { useAppActions, useAppData, useAppFlags, useAppPreferences } from '../context/AppContext'
import { isSafeMediaSrc } from '../utils/urlPolicy'
import { normalizeCanvasHtmlForDarkMode } from '../utils/canvasHtmlDarkMode'

let allowExternalEmbeds = false
let allowExternalMedia = false
let canvasOrigin: string | null = null
let mediaAllowHosts: string[] = []

function setHtmlPolicy(next: {
  allowExternalEmbeds: boolean
  allowExternalMedia: boolean
  baseUrl: string
  mediaAllowHosts?: string[]
}) {
  allowExternalEmbeds = !!next.allowExternalEmbeds
  allowExternalMedia = !!next.allowExternalMedia
  mediaAllowHosts = Array.isArray(next.mediaAllowHosts)
    ? next.mediaAllowHosts.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    : []
  try {
    canvasOrigin = new URL(next.baseUrl).origin
  } catch {
    canvasOrigin = null
  }
}

function hostAllowed(host: string, allowlist: string[]): boolean {
  const h = String(host || '').toLowerCase()
  return allowlist.some((entry) => h === entry || h.endsWith(`.${entry}`))
}

function resolveHttpUrl(rawUrl: string): URL | null {
  if (!rawUrl) return null
  try {
    return new URL(rawUrl)
  } catch {
    if (!canvasOrigin) return null
    try {
      return new URL(rawUrl, canvasOrigin)
    } catch {
      return null
    }
  }
}

function isAllowedResolvedUrl(u: URL, kind: 'embed' | 'media'): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  if (canvasOrigin && u.origin === canvasOrigin) return true
  if (kind === 'embed') return allowExternalEmbeds
  if (allowExternalMedia) return true
  if (mediaAllowHosts.length && hostAllowed(u.hostname, mediaAllowHosts)) return true
  return false
}

function extractFileIdFromEndpoint(endpoint: string): string | null {
  if (!endpoint) return null
  try {
    const u = resolveHttpUrl(endpoint)
    if (!u) return null
    const match = u.pathname.match(/\/files\/(\d+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function stashSrc(el: Element, attr: 'src' | 'srcset') {
  const v = el.getAttribute(attr)
  if (!v) return
  el.setAttribute(`data-wb-${attr}`, v)
  el.removeAttribute(attr)
  el.setAttribute('data-wb-blocked', '1')
}

function buildEmbedPlaceholder(src: string) {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-wb-embed-blocked', '1')
  wrapper.setAttribute('data-wb-embed-src', src)
  wrapper.setAttribute(
    'style',
    [
      'padding:12px',
      'border:1px dashed #f59e0b',
      'background:#fffbeb',
      'color:#92400e',
      'font-size:12px',
      'border-radius:8px',
      'line-height:1.4',
    ].join(';'),
  )
  const text = document.createElement('span')
  text.textContent = 'External embed blocked.'
  const spacer = document.createTextNode(' ')
  const link = document.createElement('a')
  link.setAttribute('href', '#')
  link.setAttribute('data-wb-open-settings', '1')
  link.textContent = 'Enable External Embeds in Settings'
  wrapper.append(text, spacer, link)
  return wrapper
}

// Configure global DOMPurify hooks for security
// 1. Enforce strict sandbox on iframes
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const el = node as Element
    const rawSrc = el.getAttribute('src') || ''
    if (!rawSrc) {
      el.remove()
      return
    }

    const resolved = resolveHttpUrl(rawSrc)
    if (!resolved || !isAllowedResolvedUrl(resolved, 'embed')) {
      const placeholder = buildEmbedPlaceholder(rawSrc)
      el.replaceWith(placeholder)
      return
    }
    if (resolved.toString() !== rawSrc) {
      el.setAttribute('src', resolved.toString())
    }

    // Force sandbox with minimal permissions
    // NO allow-same-origin (prevents accessing parent)
    // NO allow-top-navigation (prevents redirecting app)
    const sandbox = 'allow-scripts allow-forms'
    el.setAttribute('sandbox', sandbox)
    
    // Prevent srcdoc abuse
    el.removeAttribute('srcdoc')
    
    // Security headers for the frame
    el.setAttribute('loading', 'lazy')
    el.setAttribute('referrerpolicy', 'no-referrer')
  }
})

// 1b. Default-block external media; allow same-origin Canvas media. If blocked, stash src for opt-in load.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as Element
  const tag = (el.tagName || '').toUpperCase()

  if (tag === 'IMG') {
    // Always limit referrer leakage (even when allowed).
    el.setAttribute('referrerpolicy', 'no-referrer')
    const src = el.getAttribute('src') || ''
    if (
      src &&
      !src.startsWith('data:') &&
      !src.startsWith('blob:') &&
      !src.startsWith('canvas-file:')
    ) {
      const resolved = resolveHttpUrl(src)
      if (!resolved || !isAllowedResolvedUrl(resolved, 'media')) {
        stashSrc(el, 'src')
        const srcset = el.getAttribute('srcset') || ''
        if (srcset) stashSrc(el, 'srcset')
        if (!el.getAttribute('alt')) el.setAttribute('alt', '[External image blocked]')
      } else if (resolved.toString() !== src) {
        el.setAttribute('src', resolved.toString())
      }
    }
  }

  if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SOURCE') {
    const src = el.getAttribute('src') || ''
    if (
      src &&
      !src.startsWith('data:') &&
      !src.startsWith('blob:') &&
      !src.startsWith('canvas-file:')
    ) {
      const resolved = resolveHttpUrl(src)
      if (!resolved || !isAllowedResolvedUrl(resolved, 'media')) {
        stashSrc(el, 'src')
      } else if (resolved.toString() !== src) {
        el.setAttribute('src', resolved.toString())
      }
    }
  }
})

// 2. Ensure links open safely if they bypass the click handler
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as Element
  if ('target' in el) {
    el.setAttribute('target', '_blank')
    el.setAttribute('rel', 'noopener noreferrer')
  }
})

type Props = {

  html: string

  onNavigate?: (url: string, title?: string) => void
  className?: string
}

export const HtmlContent: React.FC<Props> = ({ html, onNavigate, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const data = useAppData()
  const appActions = useAppActions()
  const { externalEmbedsEnabled, externalMediaEnabled } = useAppFlags()
  const { themeSettings } = useAppPreferences()
  const isDarkMode = themeSettings.theme === 'dark'
  const shouldNormalize = isDarkMode
  const [blockedCount, setBlockedCount] = React.useState(0)
  const [blockedEmbedCount, setBlockedEmbedCount] = React.useState(0)
  const [mediaAllowedForThisRender, setMediaAllowedForThisRender] = React.useState(false)
  const [mediaAllowHosts, setMediaAllowHosts] = React.useState<string[]>(['inscloudgate.net'])

  React.useEffect(() => {
    let active = true
    const normalizeHosts = (list: string[]) =>
      list.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const cfgData = (cfg?.ok ? (cfg.data as any) : {}) as any
        const fromCfg = Array.isArray(cfgData?.courseImageAllowlist)
          ? cfgData.courseImageAllowlist
          : []
        const extraMedia = Array.isArray(cfgData?.externalMediaAllowlist)
          ? cfgData.externalMediaAllowlist
          : []
        let baseHost = ''
        try {
          baseHost = new URL(data.baseUrl).hostname
        } catch {}
        const next = normalizeHosts(['inscloudgate.net', baseHost, ...fromCfg, ...extraMedia])
        if (active && next.length) setMediaAllowHosts(next)
      } catch {}
    })()
    return () => {
      active = false
    }
  }, [data.baseUrl])
  const sanitized = useMemo(() => {
    setHtmlPolicy({
      allowExternalEmbeds: externalEmbedsEnabled,
      allowExternalMedia: externalMediaEnabled || mediaAllowedForThisRender,
      baseUrl: data.baseUrl,
      mediaAllowHosts,
    })
    const base = DOMPurify.sanitize(html || '', {
      USE_PROFILES: { html: true },
      ADD_ATTR: [
        'style',
        'target',
        'rel',
        'class',
        'id',
        'src',
        'href',
        'alt',
        'title',
        'width',
        'height',
        'srcset',
        'sizes',
        'loading',
        'decoding',
        'referrerpolicy',
        'allow',
        'allowfullscreen',
        'frameborder',
        'data-api-endpoint',
        'data-api-returntype',
        'data-wb-src',
        'data-wb-srcset',
        'data-wb-blocked',
        'data-wb-embed-blocked',
        'data-wb-embed-src',
        'data-wb-open-settings',
      ],
      ADD_TAGS: ['img', 'video', 'audio', 'source', 'picture', 'figure', 'figcaption', 'iframe'],
      // Keep links and images functional, but block unknown protocols
      ALLOW_UNKNOWN_PROTOCOLS: false,
    } as any) as unknown as string
    return shouldNormalize ? normalizeCanvasHtmlForDarkMode(base) : base
  }, [
    html,
    externalEmbedsEnabled,
    externalMediaEnabled,
    mediaAllowedForThisRender,
    data.baseUrl,
    mediaAllowHosts,
    shouldNormalize,
  ])

  // Optimize image loading - set eager loading, high priority, and fade-in effect
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Count blocked external media/embeds in the current render.
    try {
      const blocked = el.querySelectorAll('[data-wb-blocked="1"]').length
      setBlockedCount(blocked)
      const blockedEmbeds = el.querySelectorAll('[data-wb-embed-blocked="1"]').length
      setBlockedEmbedCount(blockedEmbeds)
    } catch {
      setBlockedCount(0)
      setBlockedEmbedCount(0)
    }

    const images = el.querySelectorAll('img')
    images.forEach((img) => {
      // Load immediately, don't defer
      img.setAttribute('loading', 'eager')
      // Decode in parallel with other work
      img.setAttribute('decoding', 'async')
      // High priority fetch
      img.setAttribute('fetchpriority', 'high')

      // Fade-in effect: start hidden, fade in when loaded
      img.style.opacity = '0'
      img.style.transition = 'opacity 0.2s ease-out'

      const handleLoad = () => {
        img.style.opacity = '1'
      }

      // If already loaded (cached), show immediately
      if (img.complete && img.naturalHeight !== 0) {
        img.style.opacity = '1'
      } else {
        img.addEventListener('load', handleLoad, { once: true })
      }

      const apiEndpoint = img.getAttribute('data-api-endpoint') || ''
      if (apiEndpoint && typeof window !== 'undefined' && window.canvas?.getFile) {
        const handleError = async () => {
          const fileId = extractFileIdFromEndpoint(apiEndpoint)
          if (!fileId) return
          try {
            const res = await window.canvas.getFile(fileId)
            const nextUrl = res?.ok ? (res.data as any)?.url : null
            if (!nextUrl) return
            const allowExternal = externalMediaEnabled || mediaAllowedForThisRender
            if (isSafeMediaSrc(nextUrl, data.baseUrl, allowExternal, mediaAllowHosts)) {
              img.src = nextUrl
            }
          } catch {}
        }
        img.addEventListener('error', handleError, { once: true })
      }
    })
  }, [sanitized, externalMediaEnabled, mediaAllowedForThisRender, data.baseUrl, mediaAllowHosts])

  const onLoadExternalMedia = () => {
    const el = containerRef.current
    if (!el) return
    try {
      // Allow for this render and re-sanitize so media sources are restored.
      setMediaAllowedForThisRender(true)
    } catch {}
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const openSettings = target.closest('[data-wb-open-settings="1"]') as HTMLElement | null
      if (openSettings) {
        e.preventDefault()
        appActions.onOpenSettings?.()
        return
      }
      const a = target.closest('a') as HTMLAnchorElement | null
      if (!a || !a.href) return
      // Only intercept if consumer provided a handler
      if (!onNavigate) return
      e.preventDefault()
      const href = a.href || a.getAttribute('href') || ''
      const title = a.innerText || a.textContent || undefined
      onNavigate(href, title)
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [onNavigate, appActions])

  const normalizedClassName = shouldNormalize ? `${className} rich-html--dark`.trim() : className

  return (
    <div className={normalizedClassName}>
      {!externalEmbedsEnabled && blockedEmbedCount > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center justify-between gap-3">
            <div>External embeds blocked ({blockedEmbedCount}). Enable in Settings to view.</div>
            <button
              type="button"
              className="rounded-md bg-amber-200 px-2 py-1 font-medium hover:bg-amber-300"
              onClick={appActions.onOpenSettings}
            >
              Open settings
            </button>
          </div>
        </div>
      )}
      {!externalMediaEnabled && blockedCount > 0 && !mediaAllowedForThisRender && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center justify-between gap-3">
            <div>External media blocked ({blockedCount}).</div>
            <button
              type="button"
              className="rounded-md bg-amber-200 px-2 py-1 font-medium hover:bg-amber-300"
              onClick={onLoadExternalMedia}
            >
              Load media
            </button>
          </div>
        </div>
      )}
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: sanitized }} />
    </div>
  )
}
