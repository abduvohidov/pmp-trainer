import type { Answer, Attempt, Filters, Mode, Question, Session, UserData, Domain } from '../types'

export const INTERVAL_DAYS = [1, 3, 7, 14, 30]
const DAY = 86_400_000

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function isCorrect(q: Question, selected: string[]): boolean {
  const correct = q.options.filter((o) => o.correct).map((o) => o.label).sort()
  const sel = selected.slice().sort()
  return correct.length === sel.length && correct.every((l, i) => l === sel[i])
}

export function applyFilters(bank: Question[], f: Partial<Filters>): Question[] {
  return bank.filter((q) => {
    if (q.archived) return false
    if (f.domains?.length && !f.domains.includes(q.domain)) return false
    if (f.sources?.length && !f.sources.includes(q.source)) return false
    if (f.tags?.length && !q.tags.some((t) => f.tags!.includes(t))) return false
    return true
  })
}

/** Questions the user answered wrong on the most recent attempt. */
export function wrongQuestionIds(data: UserData): string[] {
  const last = new Map<string, Attempt>()
  for (const a of data.attempts) last.set(a.qid, a)
  return [...last.values()].filter((a) => !a.correct).map((a) => a.qid)
}

export function dueReviewIds(data: UserData, now = Date.now()): string[] {
  return Object.entries(data.review)
    .filter(([, r]) => r.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([qid]) => qid)
}

/** Weak-area weighting: questions from domains with lowest accuracy first, unseen next. */
export function pickWeighted(bank: Question[], data: UserData, count: number): Question[] {
  const acc = accuracyByDomain(bank, data)
  const seen = new Set(data.attempts.map((a) => a.qid))
  const scored = bank.map((q) => {
    const d = acc[q.domain]
    const domainWeight = d && d.total > 0 ? 1 - d.correct / d.total : 0.5
    const unseen = seen.has(q.id) ? 0 : 0.3
    return { q, w: domainWeight + unseen + Math.random() * 0.4 }
  })
  return scored
    .sort((a, b) => b.w - a.w)
    .slice(0, count)
    .map((s) => s.q)
}

export function createSession(bank: Question[], data: UserData, mode: Mode, f: Filters): Session | null {
  let pool: Question[]
  const byId = new Map(bank.map((q) => [q.id, q]))
  switch (mode) {
    case 'mistakes':
      pool = wrongQuestionIds(data).map((id) => byId.get(id)!).filter(Boolean)
      break
    case 'review':
      pool = dueReviewIds(data).map((id) => byId.get(id)!).filter(Boolean)
      break
    case 'bookmarks':
      pool = data.bookmarks.map((id) => byId.get(id)!).filter(Boolean)
      break
    default:
      pool = applyFilters(bank, f)
  }
  pool = pool.filter((q) => !q.archived)
  if (!pool.length) return null
  const chosen = mode === 'review' ? pool.slice(0, f.count) : shuffle(pool).slice(0, f.count)
  const now = Date.now()
  return {
    id: uid(),
    mode,
    questionIds: chosen.map((q) => q.id),
    answers: {},
    startedAt: now,
    deadlineAt: mode === 'exam' && f.minutes ? now + f.minutes * 60_000 : null,
    finishedAt: null,
    scorePct: null,
    filters: f,
    ...(mode === 'exam' && f.fullExam && chosen.length >= 30
      ? { breaks: [Math.round(chosen.length / 3), Math.round((2 * chosen.length) / 3)].map((after) => ({ after, taken: false })), sectionStart: 0 }
      : {}),
  }
}

export const BREAK_MS = 10 * 60_000
export const PMP_FULL = { questions: 180, minutes: 230 }

/** Apply one answer to the learning record: attempt log + Leitner box. */
function track(data: UserData, s: Session, qid: string, answer: Answer): UserData {
  const attempt: Attempt = { qid, correct: answer.correct, at: answer.at, sessionId: s.id, mode: s.mode }
  // spaced repetition (Leitner): wrong -> box 0 (1 day), right -> next box
  const prev = data.review[qid]
  const box = answer.correct ? Math.min((prev?.box ?? -1) + 1, INTERVAL_DAYS.length - 1) : 0
  const review = { ...data.review, [qid]: { box, due: answer.at + INTERVAL_DAYS[box] * DAY } }
  const attempts = [...data.attempts, attempt].slice(-5000)
  return { ...data, attempts, review }
}

/**
 * Save an answer (autosave, idempotent per question). In practice-like modes the
 * answer is locked and tracked immediately; in exam mode it can be changed until
 * submit and is tracked at finish.
 */
export function recordAnswer(data: UserData, s: Session, q: Question, selected: string[], ms?: number): { data: UserData; session: Session; answer: Answer } {
  const correct = isCorrect(q, selected)
  const answer: Answer = { selected, correct, at: Date.now(), ...(ms !== undefined ? { ms } : {}) }
  const session: Session = { ...s, answers: { ...s.answers, [q.id]: answer } }
  let next: UserData = { ...data, current: session }
  if (s.mode !== 'exam') next = track(next, s, q.id, answer)
  return { data: next, session, answer }
}

export function finishSession(data: UserData, s: Session): { data: UserData; session: Session } {
  const total = s.questionIds.length
  const right = Object.values(s.answers).filter((a) => a.correct).length
  const session: Session = { ...s, finishedAt: Date.now(), scorePct: total ? Math.round((right / total) * 1000) / 10 : 0 }
  let next = data
  if (s.mode === 'exam') for (const [qid, a] of Object.entries(s.answers)) next = track(next, s, qid, a)
  const sessions = [session, ...next.sessions].slice(0, 100)
  return { data: { ...next, sessions, current: null }, session }
}

export function isExpired(s: Session, now = Date.now()) {
  return s.deadlineAt !== null && now > s.deadlineAt
}

// ---------- analytics ----------
export interface Acc {
  correct: number
  total: number
}
export const pct = (a: Acc) => (a.total ? Math.round((a.correct / a.total) * 100) : 0)

export function accuracyByDomain(bank: Question[], data: UserData): Record<Domain, Acc> {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const out: Record<Domain, Acc> = { people: { correct: 0, total: 0 }, process: { correct: 0, total: 0 }, business: { correct: 0, total: 0 } }
  for (const a of data.attempts) {
    const q = byId.get(a.qid)
    if (!q) continue
    out[q.domain].total++
    if (a.correct) out[q.domain].correct++
  }
  return out
}

export function accuracyBy(bank: Question[], data: UserData, key: (q: Question) => string[]): Record<string, Acc> {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const out: Record<string, Acc> = {}
  for (const a of data.attempts) {
    const q = byId.get(a.qid)
    if (!q) continue
    for (const k of key(q)) {
      out[k] ??= { correct: 0, total: 0 }
      out[k].total++
      if (a.correct) out[k].correct++
    }
  }
  return out
}

export function dailySeries(data: UserData, days = 14): { day: string; correct: number; total: number }[] {
  const out: { day: string; correct: number; total: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY)
    out.push({ day: d.toISOString().slice(0, 10), correct: 0, total: 0 })
  }
  const idx = new Map(out.map((o, i) => [o.day, i]))
  for (const a of data.attempts) {
    const day = new Date(a.at)
    day.setHours(0, 0, 0, 0)
    const i = idx.get(day.toISOString().slice(0, 10))
    if (i === undefined) continue
    out[i].total++
    if (a.correct) out[i].correct++
  }
  return out
}

/** Readiness = average of last three exam-mode sessions. */
export function readiness(data: UserData): { exams: number[]; avg: number | null } {
  const exams = data.sessions.filter((s) => s.mode === 'exam' && s.scorePct !== null).slice(0, 3).map((s) => s.scorePct!)
  const avg = exams.length ? Math.round(exams.reduce((a, b) => a + b, 0) / exams.length) : null
  return { exams, avg }
}

export function overall(data: UserData): Acc {
  return { correct: data.attempts.filter((a) => a.correct).length, total: data.attempts.length }
}

export function toCSV(bank: Question[], data: UserData): string {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const rows = [['date', 'mode', 'question_id', 'domain', 'source', 'correct']]
  for (const a of data.attempts) {
    const q = byId.get(a.qid)
    rows.push([new Date(a.at).toISOString(), a.mode, a.qid, q?.domain ?? '', q?.source ?? '', a.correct ? '1' : '0'])
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

/** Question text in the UI language (falls back to Russian source). */
export function localizeQuestion(q: Question, lang: 'ru' | 'en'): { stem: string; options: { label: string; text: string; correct: boolean }[]; explanation: string; whyWrong: string[] } {
  if (lang === 'en' && q.en) {
    return {
      stem: q.en.stem,
      options: q.options.map((o, i) => ({ label: o.label, text: q.en!.options[i] ?? o.text, correct: o.correct })),
      explanation: q.en.explanation || q.explanation,
      whyWrong: q.en.whyWrong ?? q.whyWrong ?? [],
    }
  }
  return { stem: q.stem, options: q.options, explanation: q.explanation, whyWrong: q.whyWrong ?? [] }
}

/** PMP pace: 180 questions in 230 minutes ≈ 76.7 s per question. */
export const PACE_MS = Math.round((230 * 60_000) / 180)

export function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** This week's stats; points = correct×10 + answered×1 (rewards volume and accuracy). */
export function weeklyStats(data: UserData, now = new Date()): { answered: number; correct: number; points: number } {
  const week = isoWeek(now)
  let answered = 0
  let correct = 0
  for (const a of data.attempts) {
    if (isoWeek(new Date(a.at)) !== week) continue
    answered++
    if (a.correct) correct++
  }
  return { answered, correct, points: correct * 10 + answered }
}

export function avgAnswerMs(data: UserData): number | null {
  // session answers carry ms; aggregate over finished sessions
  const xs: number[] = []
  for (const s of data.sessions) for (const a of Object.values(s.answers)) if (a.ms) xs.push(a.ms)
  if (data.current) for (const a of Object.values(data.current.answers)) if (a.ms) xs.push(a.ms)
  if (!xs.length) return null
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
}

/** Consecutive days with at least one answer, ending today (or yesterday if nothing yet today). */
export function streakDays(data: UserData, now = new Date()): { days: number; today: boolean } {
  const key = (t: number) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }
  const set = new Set(data.attempts.map((a) => key(a.at)))
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  const today = set.has(key(d.getTime()))
  if (!today) d.setDate(d.getDate() - 1)
  let days = 0
  while (set.has(key(d.getTime()))) {
    days++
    d.setDate(d.getDate() - 1)
  }
  return { days, today }
}
