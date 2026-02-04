import { describe, expect, it } from 'vitest'
import { normalizeCanvasHtmlForDarkMode } from './canvasHtmlDarkMode'

describe('normalizeCanvasHtmlForDarkMode', () => {
  it('removes inline black text and white backgrounds, but keeps other colors', () => {
    const input =
      '<p>' +
      '<span style="color: #000000; background-color: #ffffff">Hello</span>' +
      '<span style="color: #236fa1; background-color: #ffffff"> Blue</span>' +
      '</p>'
    const out = normalizeCanvasHtmlForDarkMode(input)
    expect(out).not.toMatch(/color:\s*#000000/i)
    expect(out).not.toMatch(/background-color:\s*#ffffff/i)
    expect(out).toMatch(/color:/i)
    // The first span should have no style at all after stripping redundant tokens.
    expect(out).toMatch(/<span>Hello<\/span>/i)
  })

  it('removes common Canvas light-mode CSS variables', () => {
    const input =
      '<span style="color: var(--color-textdarkest); background: var(--color-backgroundLightest);">X</span>'
    const out = normalizeCanvasHtmlForDarkMode(input)
    expect(out).not.toMatch(/color:\s*var\(--color-textdarkest\)/i)
    expect(out).not.toMatch(/background:\s*var\(--color-backgroundlightest\)/i)
    expect(out).toMatch(/<span>X<\/span>/i)
  })
})
