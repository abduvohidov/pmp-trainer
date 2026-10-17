import { useState } from 'react'
import { StoreProvider, useStore } from './store'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Runner } from './pages/Runner'
import { Result } from './pages/Result'
import { Profile } from './pages/Profile'
import { Avatar } from './components/ui'
import type { Session } from './types'

type Route = { name: 'home' } | { name: 'run' } | { name: 'result'; session: Session } | { name: 'profile' }

function Shell() {
  const { user, ready, t, lang, setLang, saveWarning, data } = useStore()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [navId, setNavId] = useState(0)

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted">{t('loading')}</div>
  if (!user) return <Login />

  const nav = (r: Route) => {
    setRoute(r)
    setNavId((n) => n + 1) // re-open the profile on its list screen when the avatar is tapped again
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-line/70 bg-bg/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-1 px-3 py-2.5 sm:gap-2 sm:px-4">
          <button onClick={() => nav({ name: 'home' })} className="flex items-center gap-2 font-semibold">
            <span className="btn-grad flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold" style={{ boxShadow: 'none' }}>P</span>
            <span className="hidden sm:inline">{t('appName')}</span>
          </button>
          <div className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
            <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink">
              {t('lang')}
            </button>
            <button onClick={() => nav({ name: 'profile' })} title={t('profile')} aria-label={t('profile')} className={`rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${route.name === 'profile' ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}>
              <Avatar user={user} size={32} />
            </button>
          </div>
        </div>
        {saveWarning && <div className="bg-warn-soft px-4 py-1.5 text-center text-xs font-medium text-warn">{saveWarning}</div>}
      </header>

      {route.name === 'home' && <Dashboard onStart={() => nav({ name: 'run' })} />}
      {route.name === 'run' && (data.current ? <Runner onDone={(s) => nav({ name: 'result', session: s })} onExit={() => nav({ name: 'home' })} /> : <Dashboard onStart={() => nav({ name: 'run' })} />)}
      {route.name === 'result' && <Result session={route.session} onHome={() => nav({ name: 'home' })} onStart={() => nav({ name: 'run' })} />}
      {route.name === 'profile' && <Profile key={navId} onOpenSession={(s) => nav({ name: 'result', session: s })} onHome={() => nav({ name: 'home' })} onStart={() => nav({ name: 'run' })} />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
