import { describe, expect, it } from 'vitest'
import { normalizeMarkdownFinal, normalizeMarkdownStreaming } from './markdownNormalize'

describe('markdownNormalize', () => {
  it('normalizes common bullet glitches', () => {
    const input = ['Key takeaways:', '- - one', '• two', '* three'].join('\n')
    const out = normalizeMarkdownFinal(input)
    expect(out).toContain('\n- one\n')
    expect(out).toContain('\n- two\n')
    expect(out).toContain('\n- three')
  })

  it('normalizes numbered list variants', () => {
    const input = ['1) one', '2] two', '3 - three'].join('\n')
    const out = normalizeMarkdownFinal(input)
    expect(out).toBe(['1. one', '2. two', '3. three'].join('\n'))
  })

  it('does not rewrite the last line during streaming', () => {
    const input = ['- - good', '- - inprogress'].join('\n')
    const out = normalizeMarkdownStreaming(input)
    // First line fixed, last line left alone.
    expect(out).toBe(['- good', '- - inprogress'].join('\n'))
  })

  it('normalizes label-only headers during streaming', () => {
    const input = ['**Key takeaways:**', '- one'].join('\n')
    const out = normalizeMarkdownStreaming(input)
    expect(out.split('\n')[0]).toBe('## Key Takeaways')
  })

  it('bolds simple label lines ending with a colon', () => {
    const input = ['Summary:', 'text'].join('\n')
    const out = normalizeMarkdownFinal(input)
    expect(out.split('\n')[0]).toBe('## Summary')
  })

  it('removes colon from bold section labels', () => {
    const input = ['**Key takeaways:**', '- one'].join('\n')
    const out = normalizeMarkdownFinal(input)
    expect(out.split('\n')[0]).toBe('## Key Takeaways')
  })

  it('converts inline label lines into a header + paragraph', () => {
    const input = ['Summary: hello world'].join('\n')
    const out = normalizeMarkdownFinal(input)
    expect(out).toBe(['## Summary', 'hello world'].join('\n'))
  })
})
