export type Domain = 'people' | 'process' | 'business'

export interface Option {
  label: string
  text: string
  correct: boolean
}

export interface Question {
  id: string
  cert: 'PMP' | 'CAPM' | 'PMI_ACP'
  type: 'single' | 'multiple'
  domain: Domain
  domainName?: string
  tags: string[]
  source: string
  stem: string
  options: Option[]
  explanation: string
  image: string | null
  needsReview?: boolean
  archived?: boolean
  /** why each incorrect option is wrong (same order as options; '' for the correct one) */
  whyWrong?: string[]
  /** English version of the question text */
  en?: { stem: string; options: string[]; explanation: string; whyWrong?: string[] }
}

export type Mode = 'practice' | 'exam' | 'mistakes' | 'review' | 'bookmarks'

export interface Answer {
  selected: string[] // option labels
  correct: boolean
  at: number
  /** time spent on the question before answering, ms */
  ms?: number
}

export interface Session {
  id: string
  mode: Mode
  questionIds: string[]
  answers: Record<string, Answer>
  startedAt: number
  deadlineAt: number | null
  finishedAt: number | null
  scorePct: number | null
  filters?: Filters
  /** Full PMP simulation: optional breaks after these question indexes (1-based count), 10 min each */
  breaks?: { after: number; taken: boolean }[]
  /** Index of the first question of the current section (questions before it are locked after a break) */
  sectionStart?: number
}

export interface Filters {
  domains: Domain[]
  sources: string[]
  tags: string[]
  count: number
  minutes?: number
  /** "Как на PMP": breaks after each third, sections lock after a break */
  fullExam?: boolean
}

export interface Attempt {
  qid: string
  correct: boolean
  at: number
  sessionId: string
  mode: Mode
}

export interface ReviewItem {
  box: number // 0..4 -> intervals 1,3,7,14 days
  due: number
}

export interface UserData {
  version: 1
  attempts: Attempt[]
  bookmarks: string[]
  review: Record<string, ReviewItem>
  sessions: Session[] // finished sessions (last 100)
  current: Session | null
  profile: { name?: string; examDate?: string; targetScore?: number; targetCert?: 'PMP' | 'CAPM' | 'PMI_ACP'; lang?: 'ru' | 'en'; onboarded?: boolean }
}

export const emptyUserData = (): UserData => ({
  version: 1,
  attempts: [],
  bookmarks: [],
  review: {},
  sessions: [],
  current: null,
  profile: {},
})

export interface UserInfo {
  id: string
  name: string
  email?: string
  photo?: string
  isAdmin: boolean
  provider: 'google' | 'claude' | 'local'
}

export interface LeaderEntry {
  uid: string
  name: string
  photo?: string
  week: string // ISO week key, e.g. 2026-W42
  answered: number
  correct: number
  points: number
  updatedAt: number
}
