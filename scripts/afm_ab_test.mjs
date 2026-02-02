import { readFile } from 'node:fs/promises'

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return fallback
  const v = process.argv[idx + 1]
  return v ?? fallback
}

function nowIso() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function buildVariantA({ context, question }) {
  const system = [
    'You are an assistant inside Whiteboard, a Desktop Client for Canvas LMS.',
    '',
    'Hard rules:',
    '- Use ONLY the provided Context. If missing, say: "I don\'t have that in the provided context."',
    '- Do not mention the Context, embeddings, or internal steps.',
    "- Do not include today's date/time unless the user asked.",
    '- Do not repeat yourself.',
    '',
    'Output contract (MUST follow):',
    '- Output GitHub-flavored Markdown only.',
    '- Structure exactly:',
    '  Summary: <one sentence>',
    '',
    '  Key takeaways:',
    '  - <bullet>',
    '  - <bullet>',
    '',
    '- Bullets MUST be "- " (dash + space). Numbered lists MUST be "1. ".',
    '- Max 6 bullets.',
  ].join('\n')

  const user = [
    'Context:',
    context.trim(),
    '',
    'Question:',
    question.trim(),
    '',
    'Format reminder: Markdown only. Use "- " bullets. No date/time unless asked.',
  ].join('\n')

  return { system, user }
}

function buildVariantB({ context, question }) {
  const system = [
    'You are an assistant inside Whiteboard, a Desktop Client for Canvas LMS.',
    '',
    'Follow <rules> and <format>. Use ONLY <context>.',
    '',
    '<rules>',
    '- Only use provided context. If missing: "I don\'t have that in the provided context."',
    '- No meta talk (no "context says", no embeddings, no internal steps).',
    '- No date/time unless asked.',
    '- No repetition.',
    '</rules>',
    '',
    '<format>',
    'Return Markdown only, exactly:',
    'Summary: <one sentence>',
    '',
    'Key takeaways:',
    '- ...',
    '- ...',
    '',
    'Bullets must be "- " (dash+space). Max 6 bullets.',
    '</format>',
  ].join('\n')

  const user = [
    '<context>',
    context.trim(),
    '</context>',
    '',
    '<question>',
    question.trim(),
    '</question>',
    '',
    '<format_reminder>Markdown only. Use "- " bullets. No date/time unless asked.</format_reminder>',
  ].join('\n')

  return { system, user }
}

function scoreOutput(text) {
  const out = String(text || '')
  const lines = out.split(/\r?\n/)
  const hasSummary =
    /^Summary:\s+\S/.test(lines[0] || '') || lines.some((l) => /^Summary:\s+\S/.test(l))
  const keyIdx = lines.findIndex((l) => /^Key takeaways:\s*$/.test(l.trim()))
  const bulletLines = keyIdx >= 0 ? lines.slice(keyIdx + 1).filter((l) => /^-\s+\S/.test(l)) : []
  const bulletCount = bulletLines.length

  const hasDateLeak =
    /(Today is|Current date:|February\s+\d{1,2},\s+\d{4}|\bMonday\b|\bTuesday\b|\bWednesday\b|\bThursday\b|\bFriday\b|\bSaturday\b|\bSunday\b)/i.test(
      out,
    )

  // Very rough repetition heuristic: identical non-empty lines repeated
  const normalized = lines.map((l) => l.trim()).filter(Boolean)
  const seen = new Set()
  let repeatedLines = 0
  for (const l of normalized) {
    if (seen.has(l)) repeatedLines += 1
    seen.add(l)
  }

  const hasTags = /<\/?(context|question|rules|format|format_reminder)>/i.test(out)

  const okStructure = hasSummary && keyIdx >= 0 && bulletCount > 0 && bulletCount <= 6
  const okBullets = bulletCount > 0

  // Higher is better
  let score = 0
  if (hasSummary) score += 2
  if (keyIdx >= 0) score += 2
  if (okBullets) score += 2
  if (bulletCount > 0 && bulletCount <= 6) score += 1
  if (!hasDateLeak) score += 2
  if (repeatedLines === 0) score += 1
  if (!hasTags) score += 1

  return {
    score,
    okStructure,
    hasSummary,
    hasKeyTakeaways: keyIdx >= 0,
    bulletCount,
    hasDateLeak,
    repeatedLines,
    hasTags,
  }
}

function formatEta(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m <= 0) return `${r}s`
  return `${m}m ${String(r).padStart(2, '0')}s`
}

async function callAfmbridge({ baseUrl, system, user, temperature, maxTokens }) {
  const url = baseUrl.replace(/\/$/, '')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'ondevice',
      stream: false,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`afmbridge ${res.status}: ${body.slice(0, 400)}`)
  }
  const json = await res.json()
  return json?.choices?.[0]?.message?.content ?? ''
}

async function main() {
  const baseUrl = process.env.AFMBRIDGE_URL || 'http://localhost:8765/v1/chat/completions'
  const runs = Number(getArg('runs', '20'))
  const temperature = Number(getArg('temperature', '0.4'))
  const maxTokens = Number(getArg('maxTokens', '450'))
  const promptPath = getArg('prompt', 'scripts/afm_prompt.txt')

  const raw = await readFile(promptPath, 'utf8')
  const m = raw.match(/\bContext:\s*([\s\S]*?)\bQuestion:\s*([\s\S]*)$/)
  if (!m) {
    throw new Error(`Prompt file must contain 'Context:' then 'Question:'. Got: ${promptPath}`)
  }
  const context = m[1].trim()
  const question = m[2].trim()

  const variants = [
    { name: 'A', build: buildVariantA },
    { name: 'B', build: buildVariantB },
  ]

  const report = []
  const allStart = Date.now()
  const totalCalls = runs * variants.length
  let completedCalls = 0
  for (const v of variants) {
    const stats = {
      name: v.name,
      runs,
      okStructure: 0,
      noDateLeak: 0,
      noTags: 0,
      avgScore: 0,
      best: { score: -Infinity, text: '' },
      worst: { score: Infinity, text: '' },
    }

    const scores = []
    for (let i = 0; i < runs; i++) {
      const callStart = Date.now()
      const { system, user } = v.build({ context, question })
      const text = await callAfmbridge({ baseUrl, system, user, temperature, maxTokens })
      const s = scoreOutput(text)
      scores.push({ ...s, text })
      stats.avgScore += s.score
      if (s.okStructure) stats.okStructure += 1
      if (!s.hasDateLeak) stats.noDateLeak += 1
      if (!s.hasTags) stats.noTags += 1
      if (s.score > stats.best.score) stats.best = { score: s.score, text }
      if (s.score < stats.worst.score) stats.worst = { score: s.score, text }

      completedCalls += 1
      const elapsed = Date.now() - allStart
      const avgPerCall = completedCalls > 0 ? elapsed / completedCalls : 0
      const remaining = Math.max(0, totalCalls - completedCalls)
      const eta = formatEta(avgPerCall * remaining)
      const callMs = Date.now() - callStart
      console.log(
        `[${v.name}] run ${i + 1}/${runs}  score=${s.score}  (${formatEta(callMs)})  remaining=${remaining}  eta=${eta}`,
      )
    }

    stats.avgScore = Number((stats.avgScore / runs).toFixed(2))
    report.push(stats)
  }

  const stamp = nowIso()
  console.log(`\n[afm A/B] ${stamp}`)
  console.log(`baseUrl=${baseUrl} runs=${runs} temperature=${temperature} maxTokens=${maxTokens}`)
  console.log(`prompt=${promptPath}\n`)

  for (const r of report) {
    console.log(
      `${r.name}: avgScore=${r.avgScore} okStructure=${r.okStructure}/${r.runs} noDateLeak=${r.noDateLeak}/${r.runs} noTags=${r.noTags}/${r.runs}`,
    )
  }

  console.log('\nBest sample (by score):')
  const bestOverall = report.reduce((a, b) => (a.best.score >= b.best.score ? a : b))
  console.log(`Variant ${bestOverall.name} score=${bestOverall.best.score}`)
  console.log(bestOverall.best.text)

  console.log('\nWorst sample (by score):')
  const worstOverall = report.reduce((a, b) => (a.worst.score <= b.worst.score ? a : b))
  console.log(`Variant ${worstOverall.name} score=${worstOverall.worst.score}`)
  console.log(worstOverall.worst.text)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
