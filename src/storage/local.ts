import type { Backend } from './types'
import type { LeaderEntry, Question, UserData, UserInfo } from '../types'

const USER_KEY = 'pmp.local.user'
const DATA_KEY = 'pmp.local.data'
const BANK_KEY = 'pmp.local.questions'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode) — keep working in memory */
  }
}

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean)

export const localBackend: Backend = {
  kind: 'local',
  async currentUser() {
    return read<UserInfo>(USER_KEY)
  },
  async signIn(opts) {
    const name = (opts?.name || 'Гость').trim()
    const user: UserInfo = { id: 'local', name: name || 'Гость', isAdmin: true, provider: 'local' }
    write(USER_KEY, user)
    return user
  },
  async signOut() {
    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      /* ignore */
    }
  },
  async loadUserData() {
    return read<UserData>(DATA_KEY)
  },
  async saveUserData(_u, data) {
    write(DATA_KEY, data)
  },
  async loadQuestions() {
    return read<Question[]>(BANK_KEY)
  },
  async saveQuestions(_u, qs) {
    write(BANK_KEY, qs)
  },
  async loadLeaderboard(week) {
    const e = read<LeaderEntry>('pmp.local.leader')
    return e && e.week === week ? [e] : []
  },
  async saveLeaderboard(entry) {
    write('pmp.local.leader', entry)
  },
}

export function isAdminEmail(email?: string) {
  return !!email && adminEmails.includes(email.toLowerCase())
}
