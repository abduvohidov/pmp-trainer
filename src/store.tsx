import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Question, UserData, UserInfo } from './types'
import { emptyUserData } from './types'
import { pickBackend, type Backend } from './storage'
import bundled from './data/questions.json'
import { t as tr, type Key, type Lang } from './i18n'
import { isoWeek, weeklyStats } from './logic/engine'

interface Store {
  backend: Backend
  user: UserInfo | null
  ready: boolean
  data: UserData
  bank: Question[]
  lang: Lang
  t: (k: Key) => string
  setLang: (l: Lang) => void
  signIn: (opts?: { name?: string }) => Promise<void>
  signOut: () => Promise<void>
  update: (fn: (d: UserData) => UserData) => void
  saveBank: (qs: Question[] | null) => Promise<void>
  saveWarning: string | null
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

const BUNDLED = bundled as Question[]

export function StoreProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => pickBackend(), [])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<UserData>(emptyUserData())
  const [bank, setBank] = useState<Question[]>(BUNDLED)
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('pmp.lang') as Lang) || 'ru'
    } catch {
      return 'ru'
    }
  })
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const dirty = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const loadFor = useCallback(
    async (u: UserInfo | null) => {
      setUser(u)
      if (u) {
        const d = await backend.loadUserData(u).catch(() => null)
        setData(d ? { ...emptyUserData(), ...d } : emptyUserData())
      } else {
        setData(emptyUserData())
      }
      const qs = await backend.loadQuestions().catch(() => null)
      setBank(qs && qs.length ? qs : BUNDLED)
      setReady(true)
    },
    [backend],
  )

  useEffect(() => {
    backend.currentUser().then(loadFor, () => loadFor(null))
  }, [backend, loadFor])

  const flush = useCallback(() => {
    if (!user || !dirty.current) return
    dirty.current = false
    const ws = weeklyStats(dataRef.current)
    if (backend.saveLeaderboard && ws.answered > 0) {
      backend
        .saveLeaderboard({ uid: user.id, name: dataRef.current.profile.name?.trim() || user.name, ...(user.photo ? { photo: user.photo } : {}), week: isoWeek(), answered: ws.answered, correct: ws.correct, points: ws.points, updatedAt: Date.now() })
        .catch(() => {})
    }
    backend.saveUserData(user, dataRef.current).then(
      () => setSaveWarning(null),
      () => {
        dirty.current = true
        setSaveWarning(tr(lang, 'saveError'))
      },
    )
  }, [user, backend, lang])

  // debounced persistence + flush when the tab is hidden/closed
  useEffect(() => {
    if (!user || !dirty.current) return
    const h = setTimeout(flush, 400)
    return () => clearTimeout(h)
  }, [data, user, flush])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  const update = useCallback((fn: (d: UserData) => UserData) => {
    dirty.current = true
    setData((d) => fn(d))
  }, [])

  const signIn = useCallback(
    async (opts?: { name?: string }) => {
      const u = await backend.signIn(opts)
      await loadFor(u)
    },
    [backend, loadFor],
  )

  const signOut = useCallback(async () => {
    await backend.signOut()
    setUser(null)
    setData(emptyUserData())
  }, [backend])

  const saveBank = useCallback(
    async (qs: Question[] | null) => {
      if (!user) return
      await backend.saveQuestions(user, qs ?? [])
      setBank(qs && qs.length ? qs : BUNDLED)
    },
    [backend, user],
  )

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('pmp.lang', l)
    } catch {
      /* ignore */
    }
  }

  const value: Store = {
    backend,
    user,
    ready,
    data,
    bank,
    lang,
    t: (k) => tr(lang, k),
    setLang,
    signIn,
    signOut,
    update,
    saveBank,
    saveWarning,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
