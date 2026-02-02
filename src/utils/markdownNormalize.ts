// Minimal-diff Markdown normalization.
// Designed to be safe for streaming updates (avoid large rewrites/reordering).

function normalizeLineStreaming(line: string): string {
  // Keep indentation; normalize common list markers.
  const m = line.match(/^(\s*)(.*)$/)
  if (!m) return line
  const indent = m[1]
  let rest = m[2]

  // "- - item" -> "- item" (common model glitch)
  if (/^-\s*-\s+\S/.test(rest)) {
    rest = rest.replace(/^-\s*-\s+/, '- ')
  }

  // "• item", "* item" -> "- item"
  if (/^(?:[•*])\s+\S/.test(rest)) {
    rest = rest.replace(/^(?:[•*])\s+/, '- ')
  }

  // "1) item" or "1] item" -> "1. item"
  if (/^\d+[)\]]\s+\S/.test(rest)) {
    rest = rest.replace(/^(\d+)[)\]]\s+/, '$1. ')
  }

  // "1 - item" -> "1. item" (rare but shows up)
  if (/^\d+\s+-\s+\S/.test(rest)) {
    rest = rest.replace(/^(\d+)\s+-\s+/, '$1. ')
  }

  // Streaming-time header cleanup (label-only lines): remove ':' and render as a real heading.
  // This keeps the display stable while streaming without doing multi-line rewrites.
  if (indent.length === 0) {
    const labelOnlyBold = rest.match(/^\*\*([^*\n]{1,60})\*\*:?\s*$/)
    const labelOnlyBoldWithColonInside = rest.match(/^\*\*([^*\n]{1,60}):\*\*\s*$/)
    const labelOnlyPlain = rest.match(/^([A-Za-z][A-Za-z0-9 /&()\-]{0,60}):\s*$/)

    const rawLabel = (
      labelOnlyBoldWithColonInside?.[1] ||
      labelOnlyBold?.[1] ||
      labelOnlyPlain?.[1] ||
      ''
    ).trim()
    const label = rawLabel.replace(/:+\s*$/, '').trim()
    if (label) {
      rest = `## ${toTitleCase(label)}`
    }
  }

  return indent + rest
}

function normalizeLineFinal(line: string): string {
  const fixed = normalizeLineStreaming(line)
  const m = fixed.match(/^(\s*)(.*)$/)
  if (!m) return fixed
  const indent = m[1]
  let rest = m[2]

  if (indent.length !== 0) return fixed

  // Section header shapes -> H3 without colon.
  // Note: handle bold headers where the colon may be inside the **...**.
  const labelOnlyBold = rest.match(/^\*\*([^*\n]{1,60})\*\*\s*$/)
  const labelOnlyBoldWithColon = rest.match(/^\*\*([^*\n]{1,60}):\*\*\s*$/)
  const labelOnlyPlain = rest.match(/^([A-Za-z][A-Za-z0-9 /&()\-]{0,60}):\s*$/)
  const inlineBold = rest.match(/^\*\*([^*\n]{1,60})\*\*:?\s+(\S[\s\S]*)$/)
  const inlinePlain = rest.match(/^([A-Za-z][A-Za-z0-9 /&()\-]{0,60}):\s+(\S[\s\S]*)$/)

  const rawLabel = (
    labelOnlyBoldWithColon?.[1] ||
    labelOnlyBold?.[1] ||
    labelOnlyPlain?.[1] ||
    inlineBold?.[1] ||
    inlinePlain?.[1] ||
    ''
  ).trim()

  const label = rawLabel.replace(/:+\s*$/, '').trim()
  if (!label) return fixed

  const header = `## ${toTitleCase(label)}`
  const tail = (inlineBold?.[2] || inlinePlain?.[2] || '').trim()
  rest = tail ? `${header}\n${tail}` : header
  return rest
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      // Preserve short acronyms (AI, LMS, etc.)
      if (/^[A-Z0-9]{2,4}$/.test(word)) return word
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function normalizeCommittedLines(text: string): string {
  const normalized = String(text || '').replace(/\r\n?/g, '\n')
  const parts = normalized.split('\n')
  if (parts.length <= 1) return normalizeLineStreaming(normalized)

  // Treat the last line as "in-progress" during streaming (avoid rewriting it).
  const last = parts.pop() ?? ''
  const fixed = parts.map(normalizeLineStreaming).join('\n')
  return fixed + '\n' + last
}

export function normalizeMarkdownStreaming(text: string): string {
  return normalizeCommittedLines(text)
}

export function normalizeMarkdownFinal(text: string): string {
  // Final pass stays minimal-diff, but can normalize simple section header shapes.
  const normalized = String(text || '').replace(/\r\n?/g, '\n')
  return normalized
    .split('\n')
    .flatMap((line) => normalizeLineFinal(line).split('\n'))
    .join('\n')
}
