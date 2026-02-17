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

function toInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function toNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function nowIso() {
  return new Date().toISOString()
}

function stamp() {
  return nowIso().replace(/[:.]/g, '-')
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

function xmlEl(tag, content, attrs) {
  const attrStr = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v != null && String(v) !== '')
        .map(([k, v]) => ` ${k}="${xmlEsc(v)}"`)
        .join('')
    : ''
  return `<${tag}${attrStr}>${content}</${tag}>`
}

function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function estimateTokensApprox(text) {
  if (typeof text === 'number' && Number.isFinite(text)) {
    if (text <= 0) return 0
    return Math.ceil(text / 4)
  }
  const s = String(text || '')
  if (!s) return 0
  return Math.ceil(s.length / 4)
}

function truncateWithSuffix(text, maxChars) {
  const s = String(text || '')
  if (s.length <= maxChars) return s
  if (maxChars <= 0) return ''
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

function dueVariants(iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return [String(iso || '')]
  const year = d.getFullYear()
  const monthShort = d.toLocaleString('en-US', { month: 'short' })
  const monthLong = d.toLocaleString('en-US', { month: 'long' })
  const day = d.getDate()
  const time12 = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const isoDay = String(iso || '').slice(0, 10)

  return [
    isoDay,
    `${monthShort} ${day}`,
    `${monthLong} ${day}`,
    `${monthShort} ${day}, ${year}`,
    `${monthLong} ${day}, ${year}`,
    `${monthShort} ${day}, ${time12}`,
    `${monthLong} ${day}, ${time12}`,
    `${monthShort} ${day}, ${year}, ${time12}`,
    `${monthLong} ${day}, ${year}, ${time12}`,
    `${monthShort} ${day} at ${time12}`,
    `${monthLong} ${day} at ${time12}`,
    dueLabel(iso),
  ]
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

  return { today: '2026-02-06', courses, assignments, policyDocs }
}

function makeHistoryNoise() {
  return [
    { role: 'user', content: 'Can you remind me what I should prioritize this week?' },
    {
      role: 'assistant',
      content:
        'Start with due-soon assignments, then review lecture notes, and reserve time for project drafting.',
    },
    { role: 'user', content: 'I also need help balancing two classes this week.' },
    {
      role: 'assistant',
      content:
        'Focus on the nearest deadlines first and split work sessions into short blocks across both classes.',
    },
  ]
}

function buildFollowupHistory(assignmentsPool) {
  const lines = assignmentsPool
    .slice(0, 3)
    .map((a, idx) => `${idx + 1}. ${a.title} (${a.course}) - due ${dueLabel(a.due)} - ${a.points} pts`)
    .join('\n')

  return [
    { role: 'user', content: 'What assignments do I have due soon?' },
    { role: 'assistant', content: lines },
    { role: 'user', content: 'Can you include points too?' },
    { role: 'assistant', content: lines },
    ...makeHistoryNoise(),
  ]
}

function buildContentHistory(doc) {
  return [
    { role: 'user', content: `Can you explain ${doc.title}?` },
    {
      role: 'assistant',
      content:
        `${doc.title} for ${doc.course} covers policy constraints and expected actions. I can summarize specifics if you want.`,
    },
    ...makeHistoryNoise(),
  ]
}

function buildDueHistory(a) {
  return [
    { role: 'user', content: `I need deadlines for ${a.course}.` },
    {
      role: 'assistant',
      content: `${a.title} is coming up in ${a.course}, and there may be other tasks this week.`,
    },
    ...makeHistoryNoise(),
  ]
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
    out.push({
      id: `due_${i + 1}`,
      bucket: 'due_date',
      question: dueQuestions[i % dueQuestions.length](a),
      history: buildDueHistory(a),
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 7),
        policyDocs: [],
      },
      expected: { decline: false, assignment: a, requireDue: true },
    })
  }

  for (let i = 0; i < followupTarget; i += 1) {
    const pool = shuffle(kb.assignments, rng).slice(0, 3)
    const question = followupQuestions[i % followupQuestions.length]
    const target =
      question.includes('second')
        ? pool[1] || pool[0]
        : question.includes('first')
          ? pool[0]
          : pool[0]

    out.push({
      id: `follow_${i + 1}`,
      bucket: 'followup',
      question,
      history: buildFollowupHistory(pool),
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: pool,
        policyDocs: [],
      },
      expected: {
        decline: false,
        assignment: target,
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
      history: buildContentHistory(doc),
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 4),
        policyDocs: [{ title: doc.title, course: doc.course, body: amplified }],
      },
      expected: {
        decline: false,
        expectedTerms:
          doc.title === 'Late Policy'
            ? ['48 hours', '10 percent']
            : doc.title === 'Attendance and Participation'
              ? ['lab', 'unexcused']
              : ['audience', 'timeline'],
      },
    })
  }

  for (let i = 0; i < missingTarget; i += 1) {
    out.push({
      id: `missing_${i + 1}`,
      bucket: 'missing_data',
      question: missingQuestions[i % missingQuestions.length],
      history: makeHistoryNoise(),
      context: {
        today: kb.today,
        courses: kb.courses,
        assignments: shuffle(kb.assignments, rng).slice(0, 5),
        policyDocs: shuffle(kb.policyDocs, rng).slice(0, 1),
      },
      expected: { decline: true },
    })
  }

  return shuffle(out, rng).slice(0, targetCount)
}

function toStructuredContextXml(ctx) {
  const coursesXml = (ctx.courses || [])
    .map((c) => xmlEl('Course', xmlEl('Name', xmlEsc(c.name)), { id: String(c.id) }))
    .join('')

  const assignmentsXml = (ctx.assignments || [])
    .map((a) => {
      const body =
        xmlEl('Title', xmlEsc(a.title)) +
        xmlEl('Course', xmlEsc(a.course)) +
        xmlEl('DueISO', xmlEsc(a.due)) +
        xmlEl('Due', xmlEsc(dueLabel(a.due))) +
        xmlEl('Points', xmlEsc(a.points))
      return xmlEl('A', body)
    })
    .join('')

  const docsXml = (ctx.policyDocs || [])
    .map((d) => xmlEl('Doc', xmlEl('Title', xmlEsc(d.title)) + xmlEl('Course', xmlEsc(d.course)) + xmlEl('Body', xmlEsc(d.body))))
    .join('')

  return xmlEl(
    'StructuredContext',
    xmlEl('Today', xmlEsc(ctx.today)) +
      xmlEl('Courses', coursesXml) +
      xmlEl('Assignments', assignmentsXml) +
      (docsXml ? xmlEl('Docs', docsXml) : ''),
    { authoritative: 'true' },
  )
}

function formatHistoryRaw(history) {
  return (history || [])
    .map((m) => `${String(m.role || 'user').toUpperCase()}: ${String(m.content || '').replace(/[\r\n]+/g, ' ').trim()}`)
    .join('\n')
}

function summarizeHistoryXml(history) {
  const turns = history || []
  const userTail = turns
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => String(m.content || '').replace(/[\r\n]+/g, ' ').trim())

  const mentionedAssignments = []
  const assignmentPattern = /(\d+\.\s*)?([^\n(]{3,80})\(([^)\n]{3,80})\)\s*-\s*due\s*([^\n-]{3,80})/gi
  for (const m of turns.filter((t) => t.role === 'assistant')) {
    const text = String(m.content || '')
    for (const hit of text.matchAll(assignmentPattern)) {
      const title = String(hit[2] || '').trim()
      const course = String(hit[3] || '').trim()
      const due = String(hit[4] || '').trim()
      if (!title || !course) continue
      const key = `${norm(title)}|${norm(course)}`
      if (mentionedAssignments.some((x) => x.key === key)) continue
      mentionedAssignments.push({ key, title, course, due })
    }
  }

  const assignmentsXml = mentionedAssignments
    .slice(0, 5)
    .map((a, i) => xmlEl('A', xmlEl('Title', xmlEsc(a.title)) + xmlEl('Course', xmlEsc(a.course)) + (a.due ? xmlEl('Due', xmlEsc(a.due)) : ''), { ord: String(i + 1) }))
    .join('')

  const goalsXml = userTail.map((u) => xmlEl('Goal', xmlEsc(u))).join('')

  return xmlEl(
    'ConversationSummary',
    (goalsXml ? xmlEl('RecentUserGoals', goalsXml) : '') +
      (assignmentsXml ? xmlEl('MentionedAssignments', assignmentsXml) : ''),
    { source: 'deterministic' },
  )
}

const PROFILES = [
  {
    id: 'baseline_tail',
    label: 'Baseline Tail History',
    maxPromptChars: 5600,
    historyTailMessages: 10,
    includeSummary: false,
    includeFewShot: true,
    sectionOrder: ['history', 'structured', 'question'],
    trimOrder: ['history', 'structured'],
    systemStyle: 'baseline',
  },
  {
    id: 'summary_compact',
    label: 'Summary Compact',
    maxPromptChars: 5600,
    historyTailMessages: 4,
    includeSummary: true,
    includeFewShot: false,
    sectionOrder: ['summary', 'history', 'structured', 'question'],
    trimOrder: ['history', 'structured'],
    systemStyle: 'summary',
  },
  {
    id: 'summary_strict_ordered',
    label: 'Summary Strict Ordered',
    maxPromptChars: 5600,
    historyTailMessages: 2,
    includeSummary: true,
    includeFewShot: true,
    sectionOrder: ['structured', 'summary', 'history', 'question'],
    trimOrder: ['history', 'structured'],
    systemStyle: 'strict',
  },
]

function buildSystemPrompt(profile, bucket) {
  const base = [
    'You are an assistant inside Whiteboard for Canvas LMS.',
    'Use only facts from the provided XML prompt context.',
    'If needed data is missing, say exactly: "I don\'t have that in the provided context."',
    'Do not invent assignments, courses, dates, or policies.',
  ]

  if (profile.systemStyle === 'summary' || profile.systemStyle === 'strict') {
    base.push(
      'When follow-up references appear (first/second/that one), resolve them using ConversationSummary first, then RecentHistory.',
    )
  }

  if (profile.systemStyle === 'strict') {
    base.push('Prefer concise outputs; avoid repeated phrases and keep each answer under 120 words unless asked.')
  }

  if (bucket === 'content_qa') {
    return [
      ...base,
      'Output exactly this structure:',
      'Summary: <1-3 sentences>',
      '',
      'Key takeaways:',
      '- <bullet>',
      '- <bullet>',
      '- <bullet>',
      'Use 3-6 bullets and only use "- " bullets.',
    ].join('\n')
  }

  if (bucket === 'missing_data') {
    return [...base, 'Keep response to 1-2 short sentences.'].join('\n')
  }

  return [
    ...base,
    'For assignment deadline responses, include assignment title, course, due date/time, and points when available.',
    'Keep response to 1-2 short sentences.',
  ].join('\n')
}

function buildFewShot(bucket) {
  if (bucket === 'content_qa') {
    return [
      {
        role: 'user',
        content:
          '<PromptContext><StructuredContext authoritative="true"><Docs><Doc><Title>Late Policy</Title><Course>Eng 102</Course><Body>Late work accepted up to 3 days with 10 percent penalty per day. No submissions after 3 days.</Body></Doc></Docs></StructuredContext><Question>Summarize the late policy.</Question></PromptContext>',
      },
      {
        role: 'assistant',
        content:
          'Summary: The late policy allows submissions for up to three days after the deadline with a daily penalty.\n\nKey takeaways:\n- Late work is accepted for up to 3 days.\n- The penalty is 10 percent per day.\n- Work is not accepted after day 3.',
      },
    ]
  }

  if (bucket === 'followup') {
    return [
      {
        role: 'user',
        content:
          '<PromptContext><ConversationSummary source="deterministic"><MentionedAssignments><A ord="1"><Title>Homework 2</Title><Course>Math 101</Course><Due>Tue, Feb 10, 11:59 PM</Due></A><A ord="2"><Title>Discussion 3</Title><Course>Writing 201</Course><Due>Thu, Feb 12, 5:00 PM</Due></A></MentionedAssignments></ConversationSummary><Question>What about the first one?</Question></PromptContext>',
      },
      {
        role: 'assistant',
        content: 'Homework 2 in Math 101 is due Tue, Feb 10, 11:59 PM.',
      },
    ]
  }

  return []
}

function composePromptContext(sections, order) {
  const body = order
    .map((k) => sections[k])
    .filter(Boolean)
    .join('')
  return xmlEl('PromptContext', body)
}

function trimSectionsToBudget(sections, order, trimOrder, maxChars) {
  let prompt = composePromptContext(sections, order)
  let guard = 0
  while (prompt.length > maxChars && guard < 20) {
    let changed = false
    for (const key of trimOrder) {
      const cur = String(sections[key] || '')
      if (!cur) continue
      if (cur.length <= 180) {
        sections[key] = ''
      } else {
        sections[key] = truncateWithSuffix(cur, Math.floor(cur.length * 0.75))
      }
      changed = true
      prompt = composePromptContext(sections, order)
      if (prompt.length <= maxChars) break
    }
    if (!changed) break
    guard += 1
  }
  return prompt
}

function buildProfilePrompt(profile, testCase) {
  const history = testCase.history || []
  const historyTail = history.slice(-profile.historyTailMessages)
  const sections = {
    summary: profile.includeSummary ? summarizeHistoryXml(history) : '',
    history: historyTail.length ? xmlEl('RecentHistory', xmlEsc(formatHistoryRaw(historyTail))) : '',
    structured: toStructuredContextXml(testCase.context),
    question: xmlEl('Question', xmlEsc(testCase.question)),
  }

  const userPrompt = trimSectionsToBudget(
    sections,
    profile.sectionOrder,
    profile.trimOrder,
    profile.maxPromptChars,
  )

  const system = buildSystemPrompt(profile, testCase.bucket)
  const messages = [{ role: 'system', content: system }]

  if (profile.includeFewShot) {
    const few = buildFewShot(testCase.bucket)
    messages.push(...few)
  }

  messages.push({ role: 'user', content: userPrompt })

  return {
    messages,
    promptChars: messages.map((m) => String(m.content || '').length).reduce((a, b) => a + b, 0),
    userPrompt,
  }
}

function hasDecline(text) {
  return /i don't have|do not have|can't determine|cannot determine|not enough|missing from the provided context/i.test(
    String(text || ''),
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

function tokenizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
}

function buildAllowedEntities(testCase) {
  const set = new Set()
  for (const c of testCase.context.courses || []) set.add(norm(c.name))
  for (const a of testCase.context.assignments || []) {
    set.add(norm(a.title))
    set.add(norm(a.course))
  }
  for (const d of testCase.context.policyDocs || []) {
    set.add(norm(d.title))
    set.add(norm(d.course))
  }
  for (const h of testCase.history || []) {
    const text = String(h.content || '')
    for (const m of text.matchAll(/([^\n(]{3,80})\(([^)\n]{3,80})\)/g)) {
      set.add(norm(m[1]))
      set.add(norm(m[2]))
    }
  }
  set.delete('')
  return set
}

function hasUnsupportedEntityClaims(testCase, response) {
  const allowed = buildAllowedEntities(testCase)
  const candidates = extractCandidateEntities(response)
  return candidates.some((c) => {
    if (c.length < 6) return false
    for (const a of allowed) {
      if (a.includes(c) || c.includes(a)) return false
    }
    return true
  })
}

function buildContentGroundingTokenSet(testCase) {
  const set = new Set()
  for (const d of testCase.context.policyDocs || []) {
    for (const w of tokenizeWords(d.title)) set.add(w)
    for (const w of tokenizeWords(d.course)) set.add(w)
    for (const w of tokenizeWords(d.body)) set.add(w)
  }
  return set
}

function hasUnsupportedContentClaims(testCase, response) {
  const groundingTokens = buildContentGroundingTokenSet(testCase)
  if (groundingTokens.size === 0) return false

  const bulletLines = String(response || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^-\s+\S/.test(l))

  for (const line of bulletLines) {
    const words = tokenizeWords(line.replace(/^-\s+/, ''))
    if (words.length < 5) continue
    let hits = 0
    for (const w of words) {
      if (groundingTokens.has(w)) hits += 1
    }
    const coverage = hits / Math.max(1, words.length)
    if (coverage < 0.4) return true
  }

  return false
}

function evaluateCase(testCase, output, errText) {
  const response = String(output || '')
  const responseNorm = norm(response)
  const decline = hasDecline(response)

  const unsupportedFlag =
    testCase.bucket === 'content_qa'
      ? hasUnsupportedContentClaims(testCase, response)
      : hasUnsupportedEntityClaims(testCase, response)

  let duePass = false
  if (testCase.expected.assignment) {
    const a = testCase.expected.assignment
    const titleMatch = responseNorm.includes(norm(a.title))
    const courseMatch = responseNorm.includes(norm(a.course))
    const dueMatch = dueVariants(a.due).some((variant) => responseNorm.includes(norm(variant)))
    const requireDue = testCase.expected.requireDue !== false
    duePass = titleMatch && courseMatch && (requireDue ? dueMatch : true)
  }

  const summaryOk = /^summary:\s+/im.test(response) && /^key takeaways:\s*$/im.test(response)
  const bulletCount = response
    .split(/\r?\n/)
    .filter((l) => /^-\s+\S/.test(l.trim())).length
  const summaryFormatPass = summaryOk && bulletCount >= 3 && bulletCount <= 6

  let contentTermsPass = true
  if (testCase.expected.expectedTerms?.length) {
    contentTermsPass = testCase.expected.expectedTerms.some((term) =>
      responseNorm.includes(norm(term)),
    )
  }

  let contractPass = false
  if (testCase.bucket === 'content_qa') {
    contractPass = summaryFormatPass && contentTermsPass && !decline
  } else if (testCase.bucket === 'missing_data') {
    contractPass = decline
  } else {
    contractPass = duePass
  }

  const promptTooLarge = /context_length_exceeded|context window exceeded|socket hang up|econnreset|empty reply|timeout/i.test(
    String(errText || ''),
  )

  return {
    decline,
    unsupportedFlag,
    duePass,
    summaryFormatPass,
    contractPass,
    groundedPass: !unsupportedFlag,
    overallPass: contractPass && !unsupportedFlag,
    promptTooLarge,
    bulletCount,
  }
}

function initStats() {
  return {
    calls: 0,
    errors: 0,
    promptTooLargeErrors: 0,
    promptCharsSum: 0,
    promptTokensSum: 0,
    latencyMsSum: 0,
    groundedPass: 0,
    contractPass: 0,
    overallPass: 0,
    unsupportedFlags: 0,
    duePass: 0,
    contentFormatPass: 0,
    missingDeclinePass: 0,
    byBucket: {
      due_date: { calls: 0, pass: 0 },
      followup: { calls: 0, pass: 0 },
      content_qa: { calls: 0, pass: 0 },
      missing_data: { calls: 0, pass: 0 },
    },
  }
}

function summarizeStats(st) {
  const calls = st.calls || 1
  const completedCalls = Math.max(1, st.calls - st.errors)
  const byBucket = {
    due_date: {
      calls: st.byBucket.due_date.calls,
      pass: st.byBucket.due_date.pass,
      pass_rate: Number((st.byBucket.due_date.pass / Math.max(1, st.byBucket.due_date.calls)).toFixed(4)),
    },
    followup: {
      calls: st.byBucket.followup.calls,
      pass: st.byBucket.followup.pass,
      pass_rate: Number((st.byBucket.followup.pass / Math.max(1, st.byBucket.followup.calls)).toFixed(4)),
    },
    content_qa: {
      calls: st.byBucket.content_qa.calls,
      pass: st.byBucket.content_qa.pass,
      pass_rate: Number((st.byBucket.content_qa.pass / Math.max(1, st.byBucket.content_qa.calls)).toFixed(4)),
    },
    missing_data: {
      calls: st.byBucket.missing_data.calls,
      pass: st.byBucket.missing_data.pass,
      pass_rate: Number((st.byBucket.missing_data.pass / Math.max(1, st.byBucket.missing_data.calls)).toFixed(4)),
    },
  }

  return {
    calls: st.calls,
    error_rate: Number((st.errors / calls).toFixed(4)),
    prompt_too_large_rate: Number((st.promptTooLargeErrors / calls).toFixed(4)),
    latency_ms_avg: Number((st.latencyMsSum / completedCalls).toFixed(2)),
    prompt_chars_avg: Number((st.promptCharsSum / calls).toFixed(2)),
    prompt_tokens_est_avg: Number((st.promptTokensSum / calls).toFixed(2)),
    grounded_pass_rate: Number((st.groundedPass / calls).toFixed(4)),
    contract_pass_rate: Number((st.contractPass / calls).toFixed(4)),
    overall_pass_rate: Number((st.overallPass / calls).toFixed(4)),
    unsupported_claim_rate: Number((st.unsupportedFlags / calls).toFixed(4)),
    due_date_exact_rate: Number((st.duePass / calls).toFixed(4)),
    content_format_rate: Number((st.contentFormatPass / calls).toFixed(4)),
    missing_data_decline_rate: Number((st.missingDeclinePass / calls).toFixed(4)),
    by_bucket: byBucket,
  }
}

function scoreSummary(summary) {
  const b = summary.by_bucket
  return (
    b.due_date.pass_rate * 0.4 +
    b.followup.pass_rate * 0.3 +
    b.content_qa.pass_rate * 0.2 +
    b.missing_data.pass_rate * 0.1
  )
}

function truncateForReport(text, max = 320) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 14))}...[truncated]`
}

function buildReviewMarkdown(report) {
  const lines = []
  lines.push('# AFM XML Profile Review')
  lines.push('')
  lines.push(`- Generated: ${report.meta.at}`)
  lines.push(`- Cases: ${report.meta.cases}`)
  lines.push(`- Profiles: ${report.meta.profiles.join(', ')}`)
  lines.push(`- Max Tokens: ${report.meta.maxTokens}`)
  lines.push(`- Temperature: ${report.meta.temperature}`)
  lines.push(`- Winner: ${report.winner.winner}`)
  lines.push(`- Winner Rationale: ${report.winner.rationale}`)
  lines.push('')
  lines.push('## Metrics')
  lines.push('')
  lines.push('| Profile | Overall | Due | Follow-up | Content | Missing | Grounded | Unsupported | Latency(ms) | Prompt Tokens~ |')
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const [id, summary] of Object.entries(report.summaryByProfile)) {
    lines.push(
      `| ${id} | ${summary.overall_pass_rate} | ${summary.by_bucket.due_date.pass_rate} | ${summary.by_bucket.followup.pass_rate} | ${summary.by_bucket.content_qa.pass_rate} | ${summary.by_bucket.missing_data.pass_rate} | ${summary.grounded_pass_rate} | ${summary.unsupported_claim_rate} | ${summary.latency_ms_avg} | ${summary.prompt_tokens_est_avg} |`,
    )
  }
  lines.push('')

  const buckets = ['due_date', 'followup', 'content_qa', 'missing_data']
  for (const bucket of buckets) {
    lines.push(`## Bucket: ${bucket}`)
    lines.push('')
    for (const profile of report.meta.profiles) {
      const rows = report.rawResults.filter((r) => r.bucket === bucket && r.profile === profile)
      const fails = rows.filter((r) => !r.eval.overallPass && !r.errorText).slice(0, 3)
      const pass = rows.find((r) => r.eval.overallPass && !r.errorText)

      lines.push(`### ${profile}`)
      lines.push('')
      lines.push(`- Calls: ${rows.length}`)
      lines.push(`- Error count: ${rows.filter((r) => r.errorText).length}`)
      lines.push(`- Fail samples shown: ${fails.length}`)
      lines.push('')

      if (fails.length === 0) {
        lines.push('- No non-error fail samples available in this bucket/profile.')
        lines.push('')
      } else {
        for (const row of fails) {
          lines.push(`- Fail Case: ${row.caseId}`)
          lines.push(`  Question: ${truncateForReport(row.question, 220)}`)
          lines.push(`  Output: ${truncateForReport(row.output, 360)}`)
          lines.push(
            `  Eval: pass=${row.eval.overallPass}, contract=${row.eval.contractPass}, grounded=${row.eval.groundedPass}, unsupported=${row.eval.unsupportedFlag}, decline=${row.eval.decline}`,
          )
          lines.push('')
        }
      }

      if (pass) {
        lines.push(`- Pass Case: ${pass.caseId}`)
        lines.push(`  Question: ${truncateForReport(pass.question, 220)}`)
        lines.push(`  Output: ${truncateForReport(pass.output, 360)}`)
        lines.push('')
      }
    }
  }
  return lines.join('\n')
}

function chooseWinner(summaryByProfile) {
  const entries = Object.entries(summaryByProfile)
    .map(([id, s]) => ({ id, summary: s, score: scoreSummary(s) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.summary.overall_pass_rate !== a.summary.overall_pass_rate) {
        return b.summary.overall_pass_rate - a.summary.overall_pass_rate
      }
      return a.summary.latency_ms_avg - b.summary.latency_ms_avg
    })

  const winner = entries[0]
  const second = entries[1]
  return {
    winner: winner.id,
    weighted_score: Number(winner.score.toFixed(4)),
    margin_vs_second: second ? Number((winner.score - second.score).toFixed(4)) : null,
    rationale: second
      ? `winner=${winner.id} score=${winner.score.toFixed(4)} vs ${second.id} score=${second.score.toFixed(4)}`
      : 'single profile only',
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
            resolve(JSON.parse(data))
          } catch (err) {
            reject(new Error(`invalid_json: ${String(err)}`))
          }
        })
      },
    )

    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function requestViaHttp(url, payload, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`afmbridge ${res.status}: ${text.slice(0, 400)}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

async function callAfm(payload, transport) {
  const start = Date.now()
  const json =
    transport.type === 'http'
      ? await requestViaHttp(transport.url, payload, transport.timeoutMs)
      : await requestViaSocket(transport.socketPath, payload, transport.timeoutMs)
  return {
    text: json?.choices?.[0]?.message?.content ?? '',
    latencyMs: Date.now() - start,
  }
}

function waitForSocket(socketPath, timeoutMs) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (fs.existsSync(socketPath)) return resolve()
      if (Date.now() - start > timeoutMs) return reject(new Error('socket_ready_timeout'))
      setTimeout(tick, 50)
    }
    tick()
  })
}

async function startLocalServer(binaryPath) {
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`afmbridge binary not found: ${binaryPath}`)
  }

  const socketPath = path.join(os.tmpdir(), `wb-afm-profile-eval-${process.pid}-${Date.now()}.sock`)
  const child = spawn(binaryPath, ['--socket', socketPath, '--quiet'])

  await waitForSocket(socketPath, 12000)

  return {
    socketPath,
    stop: async () => {
      if (!child.killed) child.kill('SIGINT')
      await new Promise((r) => setTimeout(r, 200))
      if (!child.killed) child.kill('SIGKILL')
      if (fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath)
        } catch {
          // ignore
        }
      }
    },
  }
}

async function main() {
  const cases = toInt(getArg('cases', '120'), 120)
  const seed = getArg('seed', 'xml-profiles')
  const maxTokens = toInt(getArg('maxTokens', '180'), 180)
  const temperature = toNumber(getArg('temperature', '0.2'), 0.2)
  const timeoutMs = toInt(getArg('timeoutMs', '45000'), 45000)

  const profileFilter = String(getArg('profiles', 'baseline_tail,summary_compact,summary_strict_ordered'))
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const profiles = PROFILES.filter((p) => profileFilter.includes(p.id))
  if (!profiles.length) throw new Error('No valid profiles selected')

  const afmUrl = process.env.AFMBRIDGE_URL
  const binaryPath =
    getArg('binary', '') || path.join(process.cwd(), 'resources', 'bin', 'afmbridge-server')

  let local = null
  let transport = null

  if (afmUrl) {
    transport = { type: 'http', url: afmUrl, timeoutMs }
    console.log(`[profiles-eval] using AFMBRIDGE_URL=${afmUrl}`)
  } else {
    console.log(`[profiles-eval] starting local afmbridge-server: ${binaryPath}`)
    local = await startLocalServer(binaryPath)
    transport = { type: 'socket', socketPath: local.socketPath, timeoutMs }
  }

  const evalCases = buildCases(cases, seed)
  const rng = createRng(`${seed}-order`)

  const totalCalls = evalCases.length * profiles.length
  let completed = 0
  const startedAll = Date.now()

  const statsByProfile = Object.fromEntries(profiles.map((p) => [p.id, initStats()]))
  const rawResults = []

  try {
    for (const testCase of evalCases) {
      const order = shuffle(profiles, rng)
      for (const profile of order) {
        const { messages, promptChars, userPrompt } = buildProfilePrompt(profile, testCase)
        const payload = {
          model: 'ondevice',
          stream: false,
          temperature,
          max_tokens: maxTokens,
          messages,
        }

        let output = ''
        let latencyMs = 0
        let errText = ''

        try {
          const result = await callAfm(payload, transport)
          output = String(result.text || '')
          latencyMs = result.latencyMs
        } catch (err) {
          errText = String(err?.message || err)
        }

        const evalResult = evaluateCase(testCase, output, errText)
        const st = statsByProfile[profile.id]

        st.calls += 1
        st.byBucket[testCase.bucket].calls += 1
        st.promptCharsSum += promptChars
        st.promptTokensSum += Math.ceil(promptChars / 4)

        if (errText) {
          st.errors += 1
          if (evalResult.promptTooLarge) st.promptTooLargeErrors += 1
        } else {
          st.latencyMsSum += latencyMs
          if (evalResult.groundedPass) st.groundedPass += 1
          if (evalResult.contractPass) st.contractPass += 1
          if (evalResult.overallPass) st.overallPass += 1
          if (evalResult.unsupportedFlag) st.unsupportedFlags += 1
          if (evalResult.duePass) st.duePass += 1
          if (evalResult.summaryFormatPass) st.contentFormatPass += 1
          if (testCase.bucket === 'missing_data' && evalResult.decline) st.missingDeclinePass += 1
          if (evalResult.overallPass) st.byBucket[testCase.bucket].pass += 1
        }

        rawResults.push({
          caseId: testCase.id,
          bucket: testCase.bucket,
          profile: profile.id,
          question: testCase.question,
          promptChars,
          promptTokensEst: estimateTokensApprox(promptChars),
          latencyMs,
          errorText: errText,
          output,
          eval: evalResult,
          userPrompt,
        })

        completed += 1
        const elapsed = Date.now() - startedAll
        const avgPer = completed > 0 ? elapsed / completed : 0
        const remain = Math.max(0, totalCalls - completed)
        const eta = formatEta(avgPer * remain)
        const tag = errText ? `ERR ${errText.slice(0, 70)}` : `pass=${evalResult.overallPass}`
        console.log(`[${completed}/${totalCalls}] ${testCase.id} ${profile.id} ${tag} eta=${eta}`)
      }
    }
  } finally {
    if (local) await local.stop()
  }

  const summaryByProfile = Object.fromEntries(
    Object.entries(statsByProfile).map(([id, st]) => [id, summarizeStats(st)]),
  )

  const winner = chooseWinner(summaryByProfile)

  const report = {
    meta: {
      at: nowIso(),
      seed,
      cases: evalCases.length,
      profiles: profiles.map((p) => p.id),
      maxTokens,
      temperature,
      timeoutMs,
      transport: transport.type === 'http' ? transport.url : 'unix_socket',
    },
    summaryByProfile,
    winner,
    rawResults,
  }

  const outDir = path.join(process.cwd(), 'docs', 'ai-evals')
  await fsp.mkdir(outDir, { recursive: true })
  const baseName = `afm-xml-profiles-${stamp()}`
  const outPath = path.join(outDir, `${baseName}.json`)
  const jsonlPath = path.join(outDir, `${baseName}.jsonl`)
  const mdPath = path.join(outDir, `${baseName}.md`)

  await fsp.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8')

  const jsonl = report.rawResults
    .map((row) =>
      JSON.stringify({
        caseId: row.caseId,
        bucket: row.bucket,
        profile: row.profile,
        question: row.question,
        promptChars: row.promptChars,
        promptTokensEst: row.promptTokensEst,
        latencyMs: row.latencyMs,
        errorText: row.errorText,
        output: row.output,
        eval: row.eval,
      }),
    )
    .join('\n')
  await fsp.writeFile(jsonlPath, jsonl, 'utf8')
  await fsp.writeFile(mdPath, buildReviewMarkdown(report), 'utf8')

  console.log('\n=== XML Profile Summary ===')
  for (const [id, s] of Object.entries(summaryByProfile)) {
    const b = s.by_bucket
    console.log(
      `${id}: overall=${s.overall_pass_rate} due=${b.due_date.pass_rate} followup=${b.followup.pass_rate} content=${b.content_qa.pass_rate} missing=${b.missing_data.pass_rate} latency=${s.latency_ms_avg}ms tokens~${s.prompt_tokens_est_avg} err=${s.error_rate}`,
    )
  }

  console.log(`\nWinner: ${winner.winner} (score=${winner.weighted_score}, margin=${winner.margin_vs_second})`)
  console.log(`Rationale: ${winner.rationale}`)
  console.log(`Report: ${outPath}`)
  console.log(`Responses JSONL: ${jsonlPath}`)
  console.log(`Review Markdown: ${mdPath}`)
}

main().catch((err) => {
  console.error('[profiles-eval] failed:', err)
  process.exit(1)
})
