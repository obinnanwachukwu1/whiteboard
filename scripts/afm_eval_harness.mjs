#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return fallback
  const v = process.argv[idx + 1]
  return v ?? fallback
}

function nowIso() {
  return new Date().toISOString()
}

function nowStamp() {
  return nowIso().replace(/[:.]/g, '-')
}

function toInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function toNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function createRng(seedInput) {
  let h = 2166136261
  const s = String(seedInput)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let state = h >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function formatEta(ms) {
  const sec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m <= 0) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function xmlEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateWithSuffix(text, maxChars) {
  const s = String(text || '')
  if (s.length <= maxChars) return s
  const suffix = '\n\n[truncated]'
  if (maxChars <= suffix.length) return s.slice(0, maxChars)
  return s.slice(0, maxChars - suffix.length) + suffix
}

function dueLabel(iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return String(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildKnowledgeBase() {
  const courses = [
    { id: 'c1', name: 'Applied Combinatorics' },
    { id: 'c2', name: 'Tech Communication' },
    { id: 'c3', name: 'Statistics 201' },
    { id: 'c4', name: 'Biology 110' },
  ]

  const assignments = [
    { title: 'Homework 2', course: 'Applied Combinatorics', due: '2026-02-10T23:59:00', points: 50 },
    { title: 'Homework 2', course: 'Statistics 201', due: '2026-02-12T23:59:00', points: 40 },
    { title: 'Discussion Post 3', course: 'Tech Communication', due: '2026-02-09T17:00:00', points: 20 },
    { title: 'Project Proposal', course: 'Tech Communication', due: '2026-02-14T23:59:00', points: 100 },
    { title: 'Lab Report 1', course: 'Biology 110', due: '2026-02-11T12:00:00', points: 30 },
    { title: 'Quiz 2', course: 'Statistics 201', due: '2026-02-08T18:00:00', points: 25 },
    { title: 'Reading Notes 4', course: 'Applied Combinatorics', due: '2026-02-13T09:00:00', points: 10 },
    { title: 'Case Study Draft', course: 'Tech Communication', due: '2026-02-15T20:00:00', points: 60 },
  ]

  const policyDocs = [
    {
      title: 'Late Policy',
      course: 'Applied Combinatorics',
      body:
        'Late work is accepted up to 48 hours after the deadline with a 10 percent deduction per 24 hours. ' +
        'After 48 hours, submissions are not accepted unless prior accommodation is approved. ' +
        'Extension requests must be submitted before the due time using the course form. ' +
        'Regrade requests must cite rubric criteria and be submitted within seven days.',
    },
    {
      title: 'Attendance and Participation',
      course: 'Biology 110',
      body:
        'Attendance is expected for all lab sessions. Missing a lab requires a documented excuse. ' +
        'Two unexcused lab absences lower the final grade by one letter. ' +
        'Participation points are earned through check-in quizzes and peer feedback.',
    },
    {
      title: 'Project Requirements',
      course: 'Tech Communication',
      body:
        'Project Proposal must include audience definition, scope, constraints, and delivery timeline. ' +
        'Final submission includes a written report and a 5 minute presentation. ' +
        'Use APA citations for all external sources and include a references section.',
    },
  ]

  return {
    today: '2026-02-06',
    courses,
    assignments,
    policyDocs,
  }
}

function buildCases(targetCount, seed) {
  const kb = buildKnowledgeBase()
  const rng = createRng(seed)
  const out = []

  const dueQuestions = [
    (a) => `When is ${a.title} due?`,
    (a) => `What is the deadline for ${a.title} in ${a.course}?`,
    (a) => `Is ${a.title} due soon for ${a.course}?`,
    (a) => `Can you give me the due date and points for ${a.title} (${a.course})?`,
  ]

  const followupQuestions = [
    'Can you give me more info on the first one?',
    'What about the second one?',
    'When is that assignment due exactly?',
    'Which class is that one from?',
  ]

  const contentQuestions = [
    (d) => `Summarize the ${d.title} for ${d.course} and list key takeaways.`,
    (d) => `Explain the main rules in ${d.title} and give key takeaways.`,
    (d) => `What does the ${d.title} document say? Use summary and key takeaways.`,
  ]

  const missingQuestions = [
    'When is Final Exam 2 due?',
    'What is the grading policy for Quantum Computing 301?',
    'Can you tell me the due date for Homework 99?',
    'What does the absent syllabus say about bonus points?',
  ]

  const dueTarget = 48
  const followupTarget = 30
  const contentTarget = 30
  const missingTarget = Math.max(12, targetCount - dueTarget - followupTarget - contentTarget)

  for (let i = 0; i < dueTarget; i += 1) {
    const a = kb.assignments[i % kb.assignments.length]
    const q = dueQuestions[i % dueQuestions.length](a)
    out.push({
      id: `due_${i + 1}`,
      bucket: 'due_date',
      question: q,
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 6),
        policyDocs: [],
        lastAssignments: [],
      },
      expected: {
        decline: false,
        assignment: a,
      },
    })
  }

  for (let i = 0; i < followupTarget; i += 1) {
    const pool = shuffle(kb.assignments, rng).slice(0, 3)
    const question = followupQuestions[i % followupQuestions.length]
    const chosen =
      question.includes('second')
        ? pool[1] || pool[0]
        : question.includes('first')
          ? pool[0]
          : pool[0]
    out.push({
      id: `follow_${i + 1}`,
      bucket: 'followup',
      question,
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: pool,
        policyDocs: [],
        lastAssignments: pool.map((a) => ({
          title: a.title,
          course: a.course,
          due: dueLabel(a.due),
        })),
      },
      expected: {
        decline: false,
        assignment: chosen,
        requireDue: !question.toLowerCase().includes('which class'),
      },
    })
  }

  for (let i = 0; i < contentTarget; i += 1) {
    const doc = kb.policyDocs[i % kb.policyDocs.length]
    const amplified = `${doc.body} ${doc.body} ${doc.body}`
    out.push({
      id: `content_${i + 1}`,
      bucket: 'content_qa',
      question: contentQuestions[i % contentQuestions.length](doc),
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 3),
        policyDocs: [
          {
            title: doc.title,
            course: doc.course,
            body: amplified,
          },
        ],
        lastAssignments: [],
      },
      expected: {
        decline: false,
        requireSummary: true,
        expectedTerms: doc.title === 'Late Policy'
          ? ['48 hours', '10 percent']
          : doc.title === 'Attendance and Participation'
            ? ['lab', 'unexcused']
            : ['audience', 'timeline'],
      },
    })
  }

  for (let i = 0; i < missingTarget; i += 1) {
    const q = missingQuestions[i % missingQuestions.length]
    out.push({
      id: `missing_${i + 1}`,
      bucket: 'missing_data',
      question: q,
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 4),
        policyDocs: shuffle(kb.policyDocs, rng).slice(0, 1),
        lastAssignments: [],
      },
      expected: {
        decline: true,
      },
    })
  }

  return shuffle(out, rng).slice(0, targetCount)
}

function toContextXml(ctx) {
  const courseXml = ctx.courses
    .map((c) => `<Course id="${xmlEsc(c.id)}"><Name>${xmlEsc(c.name)}</Name></Course>`)
    .join('')

  const assignmentXml = ctx.assignments
    .map(
      (a) =>
        `<Assignment><Title>${xmlEsc(a.title)}</Title><Course>${xmlEsc(a.course)}</Course><DueISO>${xmlEsc(a.due)}</DueISO><Due>${xmlEsc(dueLabel(a.due))}</Due><Points>${xmlEsc(a.points)}</Points></Assignment>`,
    )
    .join('')

  const docsXml = (ctx.policyDocs || [])
    .map(
      (d) =>
        `<Doc><Title>${xmlEsc(d.title)}</Title><Course>${xmlEsc(d.course)}</Course><Body>${xmlEsc(d.body)}</Body></Doc>`,
    )
    .join('')

  const lastXml = (ctx.lastAssignments || [])
    .map(
      (a, idx) =>
        `<A ord="${idx + 1}"><Title>${xmlEsc(a.title)}</Title><Course>${xmlEsc(a.course)}</Course><Due>${xmlEsc(a.due || '')}</Due></A>`,
    )
    .join('')

  return [
    `<StructuredContext authoritative="true">`,
    `<Today>${xmlEsc(ctx.today)}</Today>`,
    `<Courses>${courseXml}</Courses>`,
    `<Assignments>${assignmentXml}</Assignments>`,
    docsXml ? `<Docs>${docsXml}</Docs>` : '',
    lastXml ? `<LastAssignments>${lastXml}</LastAssignments>` : '',
    `</StructuredContext>`,
  ]
    .filter(Boolean)
    .join('')
}

function toContextJson(ctx) {
  return JSON.stringify(
    {
      structuredContext: {
        authoritative: true,
        today: ctx.today,
        courses: ctx.courses,
        assignments: ctx.assignments.map((a) => ({
          title: a.title,
          course: a.course,
          dueIso: a.due,
          due: dueLabel(a.due),
          points: a.points,
        })),
        docs: ctx.policyDocs || [],
        lastAssignments: ctx.lastAssignments || [],
      },
    },
    null,
    2,
  )
}

function toContextPlain(ctx) {
  const courseLines = ctx.courses.map((c) => `- ${c.name} (${c.id})`).join('\n')
  const assignmentLines = ctx.assignments
    .map((a) => `- ${a.title} | ${a.course} | due ${dueLabel(a.due)} | ${a.points} pts`)
    .join('\n')
  const docLines = (ctx.policyDocs || [])
    .map((d) => `- ${d.title} (${d.course}): ${d.body}`)
    .join('\n')
  const lastLines = (ctx.lastAssignments || [])
    .map((a, i) => `${i + 1}. ${a.title} - ${a.course}${a.due ? ` - ${a.due}` : ''}`)
    .join('\n')

  return [
    `Today: ${ctx.today}`,
    `Courses:\n${courseLines}`,
    `Assignments:\n${assignmentLines}`,
    docLines ? `Docs:\n${docLines}` : '',
    lastLines ? `LastAssignments:\n${lastLines}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildContextText(ctx, variant, contextCapChars) {
  const raw =
    variant === 'xml' ? toContextXml(ctx) : variant === 'json' ? toContextJson(ctx) : toContextPlain(ctx)
  return truncateWithSuffix(raw, contextCapChars)
}

function buildSystemPrompt(bucket) {
  const common = [
    'You are an assistant inside Whiteboard for Canvas LMS.',
    'Use only the provided Context. Do not guess.',
    'If data is missing, say: "I don\'t have that in the provided context."',
    'Do not mention internal tools, context packing, or hidden steps.',
  ]

  if (bucket === 'content_qa') {
    return [
      ...common,
      'Output format:',
      'Summary: <1-3 sentences>',
      '',
      'Key takeaways:',
      '- <bullet>',
      '- <bullet>',
      '- <bullet>',
      'Use 3-6 bullets.',
    ].join('\n')
  }

  if (bucket === 'missing_data') {
    return [
      ...common,
      'Keep answer to 1-2 sentences.',
      'If asked about unavailable data, decline explicitly and do not invent entities.',
    ].join('\n')
  }

  return [
    ...common,
    'For deadline questions: include assignment title, course, due date/time, and points.',
    'Keep answer to 1-2 sentences.',
  ].join('\n')
}

function buildUserPrompt(testCase, contextText) {
  return ['Context:', contextText, '', `Question: ${testCase.question}`].join('\n')
}

function hasDecline(text) {
  return /i don't have|do not have|can't determine|cannot determine|not enough|missing from the provided context/i.test(
    text,
  )
}

function extractCandidateEntities(text) {
  const out = new Set()
  for (const m of String(text || '').matchAll(/"([^"\n]{3,80})"/g)) {
    const n = norm(m[1])
    if (n) out.add(n)
  }
  for (const line of String(text || '').split(/\r?\n/)) {
    const l = line.trim()
    if (!l.startsWith('-') && !l.startsWith('•')) continue
    const entity = l
      .replace(/^[-•]\s*/, '')
      .split(/\s+-\s+/)[0]
      .split(/\s+\(/)[0]
      .trim()
    const n = norm(entity)
    if (n && n.split(' ').length >= 2) out.add(n)
  }
  return [...out]
}

function buildAllowedEntities(ctx) {
  const set = new Set()
  for (const c of ctx.courses || []) set.add(norm(c.name))
  for (const a of ctx.assignments || []) {
    set.add(norm(a.title))
    set.add(norm(a.course))
  }
  for (const d of ctx.policyDocs || []) {
    set.add(norm(d.title))
    set.add(norm(d.course))
  }
  for (const a of ctx.lastAssignments || []) {
    set.add(norm(a.title))
    set.add(norm(a.course))
  }
  set.delete('')
  return set
}

function evaluateCase(testCase, text, latencyMs, errorText) {
  const response = String(text || '')
  const responseNorm = norm(response)
  const decline = hasDecline(response)
  const allowed = buildAllowedEntities(testCase.context)
  const candidates = extractCandidateEntities(response)
  const unsupportedFlag = candidates.some((c) => {
    if (c.length < 6) return false
    for (const a of allowed) {
      if (a.includes(c) || c.includes(a)) return false
    }
    return true
  })

  let duePass = false
  if (testCase.expected.assignment) {
    const a = testCase.expected.assignment
    const dueIsoDate = String(a.due || '').slice(0, 10)
    const dueHuman = norm(dueLabel(a.due))
    const assignmentMatch =
      responseNorm.includes(norm(a.title)) && responseNorm.includes(norm(a.course))
    const dueMatch = responseNorm.includes(norm(dueIsoDate)) || responseNorm.includes(dueHuman)
    const requireDue = testCase.expected.requireDue !== false
    duePass = assignmentMatch && (requireDue ? dueMatch : true)
  }

  const summaryOk = /^summary:\s+/im.test(response) && /^key takeaways:\s*$/im.test(response)
  const bulletCount = response
    .split(/\r?\n/)
    .filter((l) => /^-\s+\S/.test(l.trim())).length
  const summaryFormatPass = summaryOk && bulletCount >= 3 && bulletCount <= 6

  let expectedTermsPass = true
  if (testCase.expected.expectedTerms?.length) {
    expectedTermsPass = testCase.expected.expectedTerms.some((term) =>
      responseNorm.includes(norm(term)),
    )
  }

  const missingPass = testCase.expected.decline ? decline : true

  let contractPass = false
  if (testCase.bucket === 'content_qa') {
    contractPass = summaryFormatPass && expectedTermsPass && !decline
  } else if (testCase.bucket === 'missing_data') {
    contractPass = missingPass
  } else {
    contractPass = duePass || (testCase.expected.decline ? decline : false)
  }

  const promptTooLarge = /context_length_exceeded|context window exceeded|socket hang up|econnreset|empty reply/i.test(
    String(errorText || ''),
  )

  return {
    decline,
    unsupportedFlag,
    duePass,
    summaryFormatPass,
    expectedTermsPass,
    contractPass,
    groundedPass: !unsupportedFlag,
    overallPass: contractPass && !unsupportedFlag,
    promptTooLarge,
    bulletCount,
    latencyMs,
  }
}

function requestViaSocket(socketPath, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = http.request(
      {
        socketPath,
        path: '/v1/chat/completions',
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`afmbridge ${res.statusCode}: ${data.slice(0, 400)}`))
            return
          }
          try {
            const json = JSON.parse(data)
            resolve(json)
          } catch (err) {
            reject(new Error(`invalid_json: ${String(err)}`))
          }
        })
      },
    )

    req.on('timeout', () => {
      req.destroy(new Error('timeout'))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function requestViaHttp(url, payload, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`afmbridge ${res.status}: ${text.slice(0, 400)}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

async function callAfm(payload, transport) {
  const started = Date.now()
  const json =
    transport.type === 'http'
      ? await requestViaHttp(transport.url, payload, transport.timeoutMs)
      : await requestViaSocket(transport.socketPath, payload, transport.timeoutMs)
  const ended = Date.now()
  return {
    text: json?.choices?.[0]?.message?.content ?? '',
    latencyMs: ended - started,
  }
}

function waitForSocketReady(socketPath, timeoutMs) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (fs.existsSync(socketPath)) {
        resolve()
        return
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('socket_ready_timeout'))
        return
      }
      setTimeout(tick, 50)
    }
    tick()
  })
}

async function startLocalServer(binaryPath) {
  const socketPath = path.join(os.tmpdir(), `wb-afm-eval-${process.pid}-${Date.now()}.sock`)

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`afmbridge binary not found: ${binaryPath}`)
  }

  const child = spawn(binaryPath, ['--socket', socketPath, '--quiet'])
  let stderr = ''

  child.stderr?.on('data', (chunk) => {
    stderr += String(chunk)
  })

  await waitForSocketReady(socketPath, 12000)

  return {
    socketPath,
    stop: async () => {
      if (!child.killed) {
        child.kill('SIGINT')
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      if (!child.killed) child.kill('SIGKILL')
      if (fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath)
        } catch {
          // ignore
        }
      }
      if (stderr && /unavailable|error/i.test(stderr)) {
        // keep quiet by default; details are captured in report metadata if needed
      }
    },
  }
}

function initVariantStats() {
  return {
    calls: 0,
    errors: 0,
    promptTooLargeErrors: 0,
    latencyMsSum: 0,
    groundedPass: 0,
    contractPass: 0,
    overallPass: 0,
    missingDataPass: 0,
    duePass: 0,
    contentFormatPass: 0,
    unsupportedFlags: 0,
    byBucket: {
      due_date: { calls: 0, pass: 0 },
      followup: { calls: 0, pass: 0 },
      content_qa: { calls: 0, pass: 0 },
      missing_data: { calls: 0, pass: 0 },
    },
  }
}

function summarizeStats(stats) {
  const calls = stats.calls || 1
  return {
    calls: stats.calls,
    error_rate: Number((stats.errors / calls).toFixed(4)),
    prompt_too_large_rate: Number((stats.promptTooLargeErrors / calls).toFixed(4)),
    latency_ms_avg: Number((stats.latencyMsSum / calls).toFixed(2)),
    grounded_pass_rate: Number((stats.groundedPass / calls).toFixed(4)),
    contract_pass_rate: Number((stats.contractPass / calls).toFixed(4)),
    overall_pass_rate: Number((stats.overallPass / calls).toFixed(4)),
    unsupported_claim_rate: Number((stats.unsupportedFlags / calls).toFixed(4)),
    due_date_exact_rate: Number((stats.duePass / calls).toFixed(4)),
    content_format_rate: Number((stats.contentFormatPass / calls).toFixed(4)),
    missing_data_correct_decline_rate: Number((stats.missingDataPass / calls).toFixed(4)),
    by_bucket: {
      due_date: stats.byBucket.due_date,
      followup: stats.byBucket.followup,
      content_qa: stats.byBucket.content_qa,
      missing_data: stats.byBucket.missing_data,
    },
  }
}

function decideXmlVerdict(summaryByVariant) {
  const xml = summaryByVariant.xml
  const baseline = [summaryByVariant.json, summaryByVariant.plain].sort(
    (a, b) => b.overall_pass_rate - a.overall_pass_rate,
  )[0]

  const xmlWins =
    xml.grounded_pass_rate >= baseline.grounded_pass_rate - 0.005 &&
    xml.contract_pass_rate >= baseline.contract_pass_rate + 0.03 &&
    xml.error_rate <= baseline.error_rate + 0.01 &&
    xml.latency_ms_avg <= baseline.latency_ms_avg * 1.1

  const reasons = [
    `xml grounded=${xml.grounded_pass_rate} vs baseline=${baseline.grounded_pass_rate}`,
    `xml contract=${xml.contract_pass_rate} vs baseline=${baseline.contract_pass_rate}`,
    `xml error=${xml.error_rate} vs baseline=${baseline.error_rate}`,
    `xml latency=${xml.latency_ms_avg}ms vs baseline=${baseline.latency_ms_avg}ms`,
  ]

  return {
    keepXml: xmlWins,
    baselineVariant: baseline === summaryByVariant.json ? 'json' : 'plain',
    reason: reasons.join('; '),
  }
}

async function main() {
  const cases = toInt(getArg('cases', '120'), 120)
  const seed = getArg('seed', 'whiteboard-afm-eval')
  const contextCapChars = toInt(getArg('cap', '4200'), 4200)
  const maxTokens = toInt(getArg('maxTokens', '220'), 220)
  const temperature = toNumber(getArg('temperature', '0.2'), 0.2)
  const timeoutMs = toInt(getArg('timeoutMs', '45000'), 45000)
  const variants = String(getArg('variants', 'xml,json,plain'))
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v === 'xml' || v === 'json' || v === 'plain')

  if (!variants.length) {
    throw new Error('No valid variants. Use --variants xml,json,plain')
  }

  const afmUrl = process.env.AFMBRIDGE_URL
  const binaryPath =
    getArg('binary', '') || path.join(process.cwd(), 'resources', 'bin', 'afmbridge-server')

  let localServer = null
  let transport = null

  if (afmUrl) {
    transport = { type: 'http', url: afmUrl, timeoutMs }
    console.log(`[eval] using AFMBRIDGE_URL=${afmUrl}`)
  } else {
    console.log(`[eval] starting local afmbridge-server: ${binaryPath}`)
    localServer = await startLocalServer(binaryPath)
    transport = { type: 'socket', socketPath: localServer.socketPath, timeoutMs }
  }

  const evalCases = buildCases(cases, seed)
  const rng = createRng(`${seed}-order`)

  const totalCalls = evalCases.length * variants.length
  let completed = 0
  const startedAll = Date.now()

  const statsByVariant = Object.fromEntries(variants.map((v) => [v, initVariantStats()]))
  const rawResults = []

  try {
    for (const testCase of evalCases) {
      const runVariants = shuffle(variants, rng)
      for (const variant of runVariants) {
        const contextText = buildContextText(testCase.context, variant, contextCapChars)
        const payload = {
          model: 'ondevice',
          stream: false,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: buildSystemPrompt(testCase.bucket) },
            { role: 'user', content: buildUserPrompt(testCase, contextText) },
          ],
        }

        let output = ''
        let latencyMs = 0
        let errorText = ''

        try {
          const result = await callAfm(payload, transport)
          output = String(result.text || '')
          latencyMs = result.latencyMs
        } catch (err) {
          errorText = String(err?.message || err)
        }

        const evalResult = evaluateCase(testCase, output, latencyMs, errorText)
        const st = statsByVariant[variant]

        st.calls += 1
        st.byBucket[testCase.bucket].calls += 1
        if (errorText) {
          st.errors += 1
          if (evalResult.promptTooLarge) st.promptTooLargeErrors += 1
        } else {
          st.latencyMsSum += evalResult.latencyMs
          if (evalResult.groundedPass) st.groundedPass += 1
          if (evalResult.contractPass) st.contractPass += 1
          if (evalResult.overallPass) st.overallPass += 1
          if (evalResult.unsupportedFlag) st.unsupportedFlags += 1
          if (evalResult.duePass) st.duePass += 1
          if (evalResult.summaryFormatPass) st.contentFormatPass += 1
          if (testCase.expected.decline && evalResult.decline) st.missingDataPass += 1
          if (evalResult.overallPass) st.byBucket[testCase.bucket].pass += 1
        }

        rawResults.push({
          caseId: testCase.id,
          bucket: testCase.bucket,
          variant,
          question: testCase.question,
          contextChars: contextText.length,
          latencyMs,
          errorText,
          output,
          eval: evalResult,
        })

        completed += 1
        const elapsed = Date.now() - startedAll
        const avgPer = completed > 0 ? elapsed / completed : 0
        const remain = Math.max(0, totalCalls - completed)
        const eta = formatEta(avgPer * remain)
        const indicator = errorText ? `ERROR: ${errorText.slice(0, 90)}` : `ok pass=${evalResult.overallPass}`
        console.log(`[${completed}/${totalCalls}] ${testCase.id} ${variant} ${indicator} eta=${eta}`)
      }
    }
  } finally {
    if (localServer) await localServer.stop()
  }

  const summaryByVariant = Object.fromEntries(
    Object.entries(statsByVariant).map(([k, st]) => [k, summarizeStats(st)]),
  )

  const xmlVerdict = variants.includes('xml') && variants.includes('json') && variants.includes('plain')
    ? decideXmlVerdict(summaryByVariant)
    : {
        keepXml: null,
        baselineVariant: null,
        reason: 'Need xml,json,plain variants for verdict.',
      }

  const report = {
    meta: {
      at: nowIso(),
      seed,
      cases: evalCases.length,
      variants,
      contextCapChars,
      maxTokens,
      temperature,
      timeoutMs,
      transport: transport.type === 'http' ? transport.url : 'unix_socket',
    },
    summaryByVariant,
    xmlVerdict,
    rawResults,
  }

  const outDir = path.join(process.cwd(), 'docs', 'ai-evals')
  await fsp.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `afm-eval-${nowStamp()}.json`)
  await fsp.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('\n=== Summary ===')
  for (const [variant, summary] of Object.entries(summaryByVariant)) {
    console.log(
      `${variant}: overall=${summary.overall_pass_rate} grounded=${summary.grounded_pass_rate} contract=${summary.contract_pass_rate} latency=${summary.latency_ms_avg}ms errors=${summary.error_rate} promptTooLarge=${summary.prompt_too_large_rate}`,
    )
  }

  if (xmlVerdict.keepXml === true) {
    console.log(`\nXML verdict: KEEP (baseline=${xmlVerdict.baselineVariant})`)
  } else if (xmlVerdict.keepXml === false) {
    console.log(`\nXML verdict: DO NOT KEEP (baseline=${xmlVerdict.baselineVariant})`)
  } else {
    console.log('\nXML verdict: UNKNOWN')
  }
  console.log(`Reason: ${xmlVerdict.reason}`)
  console.log(`Report: ${outPath}`)
}

main().catch((err) => {
  console.error('[eval] failed:', err)
  process.exit(1)
})
