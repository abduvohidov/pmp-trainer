import type { Backend } from './types'
import type { LeaderEntry, Question, UserData, UserInfo } from '../types'
import { isAdminEmail } from './local'

/**
 * Firebase backend: Google sign-in + Firestore.
 * The SDK is loaded from Google's CDN on demand, so the bundle stays small and
 * builds without a Firebase config still work (local mode).
 */
const FB = 'https://www.gstatic.com/firebasejs/11.6.0'

export function firebaseConfig() {
  const e = import.meta.env
  if (!e.VITE_FIREBASE_API_KEY || !e.VITE_FIREBASE_PROJECT_ID) return null
  return {
    apiKey: e.VITE_FIREBASE_API_KEY,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || `${e.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: e.VITE_FIREBASE_PROJECT_ID,
    appId: e.VITE_FIREBASE_APP_ID,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdk: Promise<{ auth: any; db: any; mod: any; fs: any }> | null = null

function load() {
  if (sdk) return sdk
  sdk = (async () => {
    const cfg = firebaseConfig()!
    const app = await import(/* @vite-ignore */ `${FB}/firebase-app.js`)
    const mod = await import(/* @vite-ignore */ `${FB}/firebase-auth.js`)
    const fs = await import(/* @vite-ignore */ `${FB}/firebase-firestore.js`)
    const a = app.initializeApp(cfg)
    return { auth: mod.getAuth(a), db: fs.getFirestore(a), mod, fs }
  })()
  return sdk
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(u: any): UserInfo | null {
  if (!u) return null
  return {
    id: u.uid,
    name: u.displayName || u.email || 'Пользователь',
    email: u.email || undefined,
    photo: u.photoURL || undefined,
    isAdmin: isAdminEmail(u.email || undefined),
    provider: 'google',
  }
}

export const firebaseBackend: Backend = {
  kind: 'firebase',
  async currentUser() {
    const { auth, mod } = await load()
    return new Promise((resolve) => {
      const unsub = mod.onAuthStateChanged(auth, (u: unknown) => {
        unsub()
        resolve(toUser(u))
      })
    })
  },
  async signIn() {
    const { auth, mod } = await load()
    const provider = new mod.GoogleAuthProvider()
    const res = await mod.signInWithPopup(auth, provider)
    return toUser(res.user)
  },
  async signOut() {
    const { auth, mod } = await load()
    await mod.signOut(auth)
  },
  async loadUserData(user) {
    const { db, fs } = await load()
    const snap = await fs.getDoc(fs.doc(db, 'users', user.id))
    if (!snap.exists()) return null
    const d = snap.data()
    return JSON.parse(d.json) as UserData
  },
  async saveUserData(user, data) {
    const { db, fs } = await load()
    await fs.setDoc(fs.doc(db, 'users', user.id), {
      json: JSON.stringify(data),
      email: user.email || null,
      updatedAt: Date.now(),
    })
  },
  async loadQuestions() {
    const { db, fs } = await load()
    const snap = await fs.getDoc(fs.doc(db, 'bank', 'questions'))
    if (!snap.exists()) return null
    return JSON.parse(snap.data().json) as Question[]
  },
  async loadLeaderboard(week) {
    const { db, fs } = await load()
    const q = fs.query(fs.collection(db, 'leaderboard'), fs.where('week', '==', week), fs.orderBy('points', 'desc'), fs.limit(50))
    const snap = await fs.getDocs(q)
    return snap.docs.map((d: { data: () => LeaderEntry }) => d.data())
  },
  async saveLeaderboard(entry) {
    const { db, fs } = await load()
    await fs.setDoc(fs.doc(db, 'leaderboard', entry.uid), entry)
  },
  async saveQuestions(user, qs) {
    const { db, fs } = await load()
    await fs.setDoc(fs.doc(db, 'bank', 'questions'), {
      json: JSON.stringify(qs),
      updatedBy: user.email || user.id,
      updatedAt: Date.now(),
    })
  },
}
