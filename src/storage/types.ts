import type { LeaderEntry, Question, UserData, UserInfo } from '../types'

/**
 * Storage backend abstraction. Three implementations:
 *  - local:    localStorage only (guest / demo)
 *  - firebase: Google sign-in + Firestore (production site)
 *  - claude:   published claude.ai artifact (db + user capabilities)
 */
export interface Backend {
  kind: 'local' | 'firebase' | 'claude'
  /** Resolve current user (null = signed out). */
  currentUser(): Promise<UserInfo | null>
  signIn(opts?: { name?: string }): Promise<UserInfo | null>
  signOut(): Promise<void>
  loadUserData(user: UserInfo): Promise<UserData | null>
  saveUserData(user: UserInfo, data: UserData): Promise<void>
  /** Question bank overrides managed by admins; null = use bundled bank. */
  loadQuestions(): Promise<Question[] | null>
  saveQuestions(user: UserInfo, qs: Question[]): Promise<void>
  /** Weekly leaderboard (optional: local mode returns only the current user). */
  loadLeaderboard?(week: string): Promise<LeaderEntry[]>
  saveLeaderboard?(entry: LeaderEntry): Promise<void>
}
