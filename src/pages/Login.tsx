import { useState } from 'react'
import { useStore } from '../store'
import { Button, Icons } from '../components/ui'

const COPY = {
  ru: {
    kicker: 'Подготовка к PMP и собеседованиям на позицию руководителя проектов',
    title: 'Тренируйтесь на реальных ситуациях из экзамена PMI',
    lead: 'Ситуационные вопросы с объяснением каждого ответа, экзамен-симуляция с таймером и личный профиль, который показывает, где вы уже сильны, а что стоит подтянуть.',
    cta: 'Войти через Google',
    ctaSub: 'Бесплатно · вход за 10 секунд · прогресс сохраняется в вашем аккаунте',
    forWhom: 'Для кого',
    audience: [
      { title: 'Готовитесь к PMP / CAPM', text: 'Нужна практика на вопросах того же формата, что на экзамене, — с разбором, почему верен именно этот ответ.' },
      { title: 'Идёте на собеседование PM', text: 'Вопросы построены на типовых управленческих ситуациях: конфликт ресурсов, изменение объёма, риски, стейкхолдеры.' },
      { title: 'Уже руководите проектами', text: 'Проверьте себя по стандарту PMI и найдите слепые зоны — без курсов и расписания, 10 минут в день.' },
    ],
    benefits: 'Что вы получаете',
    list: [
      { title: 'Объяснение к каждому вопросу', text: 'Не просто «верно/неверно», а почему — и почему остальные варианты хуже.' },
      { title: 'Экзамен как настоящий', text: 'Таймер, без подсказок, результат в конце и разбор всех ответов.' },
      { title: 'Работа над ошибками', text: 'Система помнит, где вы ошиблись, и возвращает эти вопросы через 1, 3, 7, 14 дней.' },
      { title: 'Профиль с прогрессом', text: 'Точность по доменам Люди / Процесс / Бизнес-среда, история и оценка готовности.' },
    ],
    how: 'Как это работает',
    steps: ['Войдите через Google — регистрация не нужна', 'Нажмите «Начать» — первые 10 вопросов с объяснениями', 'Смотрите в профиле, что подтянуть, и повторяйте ошибки', 'Сдавайте экзамен-симуляцию, пока готовность не будет выше 75 %'],
    bottomTitle: 'Начните с 10 вопросов прямо сейчас',
    bottomText: 'Первая тренировка занимает около 10 минут.',
    guestBtn: 'Продолжить без входа',
    guestHint: 'Прогресс сохраняется только в этом браузере.',
    namePh: 'Ваше имя',
  },
  en: {
    kicker: 'PMP prep and project-manager interview practice',
    title: 'Practice on real PMI exam situations',
    lead: 'Situational questions with an explanation for every answer, a timed exam simulation and a personal profile that shows where you are strong and what to improve.',
    cta: 'Sign in with Google',
    ctaSub: 'Free · sign in takes 10 seconds · progress is saved to your account',
    forWhom: 'Who it is for',
    audience: [
      { title: 'Preparing for PMP / CAPM', text: 'You need practice on exam-format questions with a breakdown of why this answer is correct.' },
      { title: 'Interviewing for a PM role', text: 'Questions are built on typical management situations: resource conflicts, scope changes, risks, stakeholders.' },
      { title: 'Already managing projects', text: 'Check yourself against the PMI standard and find blind spots — no courses, 10 minutes a day.' },
    ],
    benefits: 'What you get',
    list: [
      { title: 'An explanation for every question', text: 'Not just right/wrong, but why — and why the other options are worse.' },
      { title: 'An exam like the real one', text: 'Timer, no hints, result at the end and a review of every answer.' },
      { title: 'Mistake review', text: 'The system remembers where you went wrong and brings those questions back after 1, 3, 7, 14 days.' },
      { title: 'A profile with progress', text: 'Accuracy by People / Process / Business Environment, history and a readiness score.' },
    ],
    how: 'How it works',
    steps: ['Sign in with Google — no registration needed', 'Press Start — the first 10 questions with explanations', 'See in your profile what to improve and retry mistakes', 'Take exam simulations until readiness is above 75 %'],
    bottomTitle: 'Start with 10 questions right now',
    bottomText: 'The first session takes about 10 minutes.',
    guestBtn: 'Continue without signing in',
    guestHint: 'Progress is stored only in this browser.',
    namePh: 'Your name',
  },
} as const

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function Login() {
  const { backend, signIn, t, bank, lang, setLang } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const c = COPY[lang]

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

  const SignIn = ({ big = false }: { big?: boolean }) => (
    <div className={big ? 'flex flex-col items-start gap-3' : ''}>
      {backend.kind === 'firebase' && (
        <Button className={big ? 'px-6 py-3.5 text-base' : 'py-3'} onClick={go} disabled={busy}>
          <GoogleIcon /> {c.cta}
        </Button>
      )}
      {backend.kind === 'claude' && (
        <Button className={big ? 'px-6 py-3.5 text-base' : 'py-3'} onClick={go} disabled={busy}>
          {t('signInClaude')} {Icons.arrow()}
        </Button>
      )}
      {backend.kind === 'local' && (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={c.namePh} className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50" onKeyDown={(e) => e.key === 'Enter' && go()} />
          <Button className="py-3" onClick={go} disabled={busy}>
            {c.guestBtn}
          </Button>
        </div>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* hero */}
      <section className="hero rounded-none px-5 py-10 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <span className="btn-grad flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold" style={{ boxShadow: 'none' }}>
                P
              </span>
              {t('appName')}
            </div>
            <button className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-navy-ink/80 hover:bg-white/10" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>
              {t('lang')}
            </button>
          </div>
          <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-medium text-navy-muted">{c.kicker}</p>
              <h1 className="mt-2 max-w-xl text-3xl font-extrabold leading-[1.1] sm:text-5xl">{c.title}</h1>
              <p className="mt-4 max-w-lg text-base text-navy-ink/85 sm:text-lg">{c.lead}</p>
              <div className="mt-7">
                <SignIn big />
                <p className="mt-3 text-xs text-navy-muted">{backend.kind === 'local' ? c.guestHint : c.ctaSub}</p>
              </div>
            </div>
            {/* product glimpse */}
            <div className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between text-xs text-navy-muted">
                <span>{lang === 'ru' ? 'Пример вопроса' : 'Sample question'}</span>
                <span>
                  {bank.length} {t('questionsInBank')}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-navy-ink/90">{lang === 'ru' ? 'Два зависимых проекта отстают от графика. Спонсор просит держать «зелёный» статус. Что должен сделать руководитель проекта?' : 'Two dependent projects are behind schedule. The sponsor asks to keep a green status. What should the project manager do?'}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                {(lang === 'ru' ? ['Сообщить о зелёном статусе', 'Сообщить о красном статусе и остановить работы', 'Сообщить о жёлтом статусе, выделить риски и дать прогноз с мерами'] : ['Report green status', 'Report red status and stop work', 'Report yellow, highlight risks and give a recovery forecast']).map((o, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${i === 2 ? 'bg-ok/20 text-white ring-1 ring-ok/50' : 'bg-white/5 text-navy-ink/70'}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 2 ? 'bg-ok text-white' : 'bg-white/10'}`}>{'ABC'[i]}</span>
                    {o}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-navy-muted">{lang === 'ru' ? 'Объяснение: честный статус с рисками и планом восстановления — прозрачность без паники.' : 'Explanation: an honest status with risks and a recovery plan — transparency without panic.'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        {/* audience */}
        <section className="py-12">
          <h2 className="text-2xl font-extrabold">{c.forWhom}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {c.audience.map((a, i) => (
              <div key={i} className="card p-5">
                <div className={`mb-3 h-1.5 w-10 rounded-full ${['bg-people', 'bg-process', 'bg-business'][i]}`} />
                <div className="font-bold">{a.title}</div>
                <p className="mt-1 text-sm text-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* benefits */}
        <section className="pb-12">
          <h2 className="text-2xl font-extrabold">{c.benefits}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {c.list.map((b, i) => (
              <div key={i} className="card flex gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{[Icons.practice(), Icons.exam(), Icons.mistakes(), Icons.target()][i]}</div>
                <div>
                  <div className="font-bold">{b.title}</div>
                  <p className="mt-1 text-sm text-muted">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* how */}
        <section className="pb-12">
          <h2 className="text-2xl font-extrabold">{c.how}</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-4">
            {c.steps.map((s, i) => (
              <li key={i} className="card p-5">
                <div className="btn-grad mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold" style={{ boxShadow: 'none' }}>
                  {i + 1}
                </div>
                <p className="text-sm">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* bottom CTA */}
        <section className="hero mb-10 px-6 py-10 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{c.bottomTitle}</h2>
          <p className="mt-2 text-navy-ink/80">{c.bottomText}</p>
          <div className="mt-6 flex justify-center">
            <SignIn big />
          </div>
        </section>
      </div>
    </div>
  )
}
