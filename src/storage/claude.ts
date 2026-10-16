import type { Backend } from './types'
import type { Question, UserData, UserInfo } from '../types'
import { localBackend } from './local'

/**
 * Backend for a page published as a claude.ai Artifact with the `db` + `user`
 * capabilities. Progress lives in the viewer's private subtree
 * `data/users/<id>/progress`; admin overrides of the bank in `bank/questions`.
 * If the viewer cannot write (view-only link) we fall back to localStorage so
 * the trainer still works.
 */
type ClaudeWindow = Window & { claude?: { use: (name: string) => Promise<unknown> } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNs = any

export function hasClaudeRuntime() {
  return typeof (window as ClaudeWindow).claude?.use === 'function'
}

let nsCache: Promise<{ db: AnyNs; user: AnyNs }> | null = null
function ns() {
  if (!nsCache) {
    const w = window as ClaudeWindow
    nsCache = Promise.all([w.claude!.use('db'), w.claude!.use('user')]).then(([db, user]) => ({ db, user }))
  }
  return nsCache
}

let writeBroken = false

export const claudeBackend: Backend = {
  kind: 'claude',
  async currentUser() {
    const { user } = await ns()
    if (!user) return null
    const id = await user.id()
    if (!id) return null
    let name = 'Участник'
    try {
      const me = await user.me()
      name = me?.name || name
    } catch {
      /* profile scope may be absent */
    }
    let isAdmin = false
    try {
      isAdmin = (await user.canEdit()) === true
    } catch {
      /* ignore */
    }
    return { id, name, isAdmin, provider: 'claude' }
  },
  async signIn() {
    return claudeBackend.currentUser()
  },
  async signOut() {
    /* sign-out is handled by claude.ai itself */
  },
  async loadUserData(user) {
    const { db } = await ns()
    if (db) {
      try {
        const snap = await db.doc(`data/users/${user.id}/progress`).get()
        if (snap.exists) return JSON.parse((snap.data() as { json: string }).json) as UserData
      } catch {
        /* fall through to local */
      }
    }
    return localBackend.loadUserData(user)
  },
  async saveUserData(user, data) {
    await localBackend.saveUserData(user, data)
    if (writeBroken) return
    const { db } = await ns()
    if (!db) return
    try {
      await db.doc(`data/users/${user.id}/progress`).set({ json: JSON.stringify(data), updatedAt: Date.now() })
    } catch (e) {
      if ((e as { code?: string })?.code === 'invalid_argument') writeBroken = true
    }
  },
  async loadQuestions() {
    const { db } = await ns()
    if (!db) return null
    try {
      const snap = await db.doc('bank/questions').get()
      if (snap.exists) return JSON.parse((snap.data() as { json: string }).json) as Question[]
    } catch {
      /* ignore */
    }
    return null
  },
  async saveQuestions(_user, qs) {
    const { db } = await ns()
    if (!db) throw new Error('db unavailable')
    await db.doc('bank/questions').set({ json: JSON.stringify(qs), updatedAt: Date.now() })
  },
}
