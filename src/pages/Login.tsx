import { useState } from 'react'
import { useStore } from '../store'
import { Button } from '../components/ui'

export function Login() {
  const { backend, signIn, t, bank, lang, setLang } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')

  const go = async () => {
    setBusy(true)
    setErr(null)
    try {
      await signIn({ name })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)] md:grid-cols-[1.1fr_1fr]">
        <div className="hero rounded-none p-7 sm:p-9">
          <div className="btn-grad mb-6 flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold" style={{ boxShadow: 'none' }}>
            P
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{t('appName')}</h1>
          <p className="mt-2 max-w-sm text-navy-ink/80">{t('tagline')}</p>
          <ol className="mt-7 space-y-3 text-sm">
            {(['step1', 'step2', 'step3'] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
                <span className="text-navy-ink/90">{t(k)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-navy-muted">
            {bank.length} {t('questionsInBank')}
          </p>
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-9">
          <h2 className="mb-1 text-xl font-bold">{lang === 'ru' ? 'Вход' : 'Sign in'}</h2>
          <p className="mb-5 text-sm text-muted">{lang === 'ru' ? 'Прогресс сохраняется в вашем аккаунте' : 'Your progress is saved to your account'}</p>
          {backend.kind === 'firebase' && (
            <Button className="w-full py-3" onClick={go} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              {t('signInGoogle')}
            </Button>
          )}
          {backend.kind === 'claude' && (
            <Button className="w-full py-3" onClick={go} disabled={busy}>
              {t('signInClaude')}
            </Button>
          )}
          {backend.kind === 'local' && (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('yourName')} className="mb-3 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm" onKeyDown={(e) => e.key === 'Enter' && go()} />
              <Button className="w-full py-3" onClick={go} disabled={busy}>
                {t('signInLocal')}
              </Button>
              <p className="mt-3 text-center text-xs text-muted">{t('localModeHint')}</p>
            </>
          )}
          {err && <p className="mt-3 text-sm text-bad">{err}</p>}
          <button className="mt-6 self-start text-xs font-medium text-muted hover:text-ink" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>
            {t('lang')}
          </button>
        </div>
      </div>
    </div>
  )
}
