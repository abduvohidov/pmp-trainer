import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../store'
import { sessionsWord } from '../i18n'
import { Avatar, Badge, Bar, Button, Modal, Stat, Stem, toneFor } from '../components/ui'
import {
  accuracyBy,
  accuracyByDomain,
  avgAnswerMs,
  createSession,
  dailySeries,
  isoWeek,
  localizeQuestion,
  overall,
  pct,
  readiness,
  streakDays,
  toCSV,
  weeklyStats,
  wrongQuestionIds,
  PACE_MS,
} from '../logic/engine'
import { googleCalendarUrl, icsFile, notificationsSupported, requestNotifications } from '../reminders'
import { saveFile } from '../download'
import { getTheme, setTheme, type Theme } from '../theme'
import type { Domain, Filters, LeaderEntry, Mode, Question, Session } from '../types'

type Section = 'stats' | 'goal' | 'history' | 'saved' | 'leaders' | 'reminders' | 'export'

// ---- small icon set for the settings-style rows ----
const G = ({ children }: { children: ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const IC = {
  stats: <G><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></G>,
  goal: <G><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></G>,
  history: <G><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></G>,
  saved: <G><path d="M6 3h12v18l-6-4-6 4z" /></G>,
  leaders: <G><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></G>,
  reminders: <G><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></G>,
  lang: <G><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></G>,
  theme: <G><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></G>,
  export: <G><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></G>,
  logout: <G><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></G>,
  chevron: <G><path d="M9 6l6 6-6 6" /></G>,
  back: <G><path d="M15 6l-6 6 6 6" /></G>,
  edit: <G><path d="M4 20h4l10-10-4-4L4 16v4z" /></G>,
  fire: <G><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z" /></G>,
}

function Row({ icon, tile, label, value, onClick, active, danger, chevron = true }: { icon: ReactNode; tile: string; label: string; value?: ReactNode; onClick: () => void; active?: boolean; danger?: boolean; chevron?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/70 ${active ? 'md:bg-accent-soft/60' : ''}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white ${tile}`}>{icon}</span>
      <span className={`min-w-0 flex-1 truncate text-[15px] font-medium ${danger ? 'text-bad' : ''}`}>{label}</span>
      {value !== undefined && <span className="shrink-0 truncate text-sm text-muted tabular-nums">{value}</span>}
      {chevron && <span className="shrink-0 text-muted/60">{IC.chevron}</span>}
    </button>
  )
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title && <div className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>}
      <div className="card divide-y divide-line overflow-hidden p-0">{children}</div>
    </div>
  )
}

export function Profile({ onOpenSession, onHome, onStart }: { onOpenSession: (s: Session) => void; onHome: () => void; onStart: () => void }) {
  const { t, user, data, bank, update, signOut, backend, lang, setLang } = useStore()
  const tx = (ru: string, en: string) => (lang === 'ru' ? ru : en)
  const [section, setSection] = useState<Section | null>(null)
  const shown: Section = section ?? 'stats'
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [saved, setSaved] = useState(false)
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null)
  const [savedTab, setSavedTab] = useState<'mistakes' | 'bookmarks'>('mistakes')
  const [peek, setPeek] = useState<Question | null>(null)
  const [remTime, setRemTime] = useState(() => {
    try {
      return localStorage.getItem('pmp.reminderTime') || '20:00'
    } catch {
      return '20:00'
    }
  })
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>(() => (notificationsSupported() ? Notification.permission : 'unsupported'))

  const avgMs = avgAnswerMs(data)
  const week = isoWeek()
  const mine = weeklyStats(data)
  useEffect(() => {
    let alive = true
    backend.loadLeaderboard?.(week).then((l) => alive && setLeaders(l), () => alive && setLeaders([]))
    return () => {
      alive = false
    }
  }, [backend, week, mine.points])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [section])

  const ov = overall(data)
  const rd = readiness(data)
  const streak = streakDays(data)
  const byDomain = accuracyByDomain(bank, data)
  const byTag = useMemo(() => accuracyBy(bank, data, (q) => q.tags), [bank, data])
  const bySource = useMemo(() => accuracyBy(bank, data, (q) => [q.source]), [bank, data])
  const daily = dailySeries(data, 14)
  const maxDay = Math.max(1, ...daily.map((d) => d.total))
  const daysLeft = data.profile.examDate ? Math.ceil((new Date(data.profile.examDate).getTime() - Date.now()) / 86_400_000) : null
  const target = data.profile.targetScore ?? 75
  const tagRows = Object.entries(byTag).filter(([, a]) => a.total >= 2)
  const weak = tagRows.filter(([, a]) => pct(a) < 70).sort((a, b) => pct(a[1]) - pct(b[1])).slice(0, 5)
  const strong = tagRows.filter(([, a]) => pct(a) >= 70).sort((a, b) => pct(b[1]) - pct(a[1])).slice(0, 5)
  const weakest = weak[0]
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])
  const mistakes = useMemo(() => wrongQuestionIds(data).map((id) => byId.get(id)).filter(Boolean) as Question[], [data, byId])
  const bookmarks = data.bookmarks.map((id) => byId.get(id)).filter(Boolean) as Question[]
  const displayName = data.profile.name?.trim() || user!.name

  // leaderboard incl. me
  const board = useMemo(() => {
    const list = (leaders ?? []).slice()
    if (user && mine.answered > 0 && !list.some((l) => l.uid === user.id)) list.push({ uid: user.id, name: displayName, photo: user.photo, week, ...mine, updatedAt: Date.now() })
    return list.sort((a, b) => b.points - a.points)
  }, [leaders, user, mine, week, displayName])
  const myRank = user ? board.findIndex((l) => l.uid === user.id) + 1 : 0

  const setProfile = (patch: Partial<typeof data.profile>) => {
    update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  const setReminder = (v: string) => {
    setRemTime(v)
    try {
      localStorage.setItem('pmp.reminderTime', v)
    } catch {
      /* ignore */
    }
  }
  const start = (mode: Mode, f: Partial<Filters> = {}) => {
    const s = createSession(bank, data, mode, { domains: [], sources: [], tags: [], count: 20, ...f })
    if (!s) return
    update((d) => ({ ...d, current: s }))
    onStart()
  }
  const toggleBookmark = (id: string) => update((d) => ({ ...d, bookmarks: d.bookmarks.includes(id) ? d.bookmarks.filter((b) => b !== id) : [...d.bookmarks, id] }))

  const remTitle = tx('PMP Тренажёр — 10 вопросов', 'PMP Trainer — 10 questions')
  const remDetails = tx('Ежедневная тренировка: практика или повторение ошибок.', 'Daily practice: new questions or mistake review.')
  const themeLabel = { system: tx('Системная', 'System'), light: tx('Светлая', 'Light'), dark: tx('Тёмная', 'Dark') }
  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
  const field = 'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm'
  const daysWord = (n: number) => (lang === 'ru' ? (n % 10 === 1 && n % 100 !== 11 ? 'день' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'дня' : 'дней') : n === 1 ? 'day' : 'days')

  const titles: Record<Section, string> = {
    stats: tx('Статистика', 'Statistics'),
    goal: tx('Имя и цель', 'Name & goal'),
    history: tx('История', 'History'),
    saved: tx('Закладки и ошибки', 'Bookmarks & mistakes'),
    leaders: t('leaderboard'),
    reminders: t('reminders'),
    export: tx('Экспорт данных', 'Export data'),
  }
  const open = (s: Section) => setSection(s)
  const statusLine = [
    rd.avg !== null ? `${t('readiness')} ${rd.avg}%` : ov.total ? `${t('accuracy')} ${pct(ov)}%` : tx('Ещё нет ответов', 'No answers yet'),
    daysLeft !== null && daysLeft >= 0 ? tx(`экзамен через ${daysLeft} ${daysWord(daysLeft)}`, `exam in ${daysLeft} ${daysWord(daysLeft)}`) : null,
  ].filter(Boolean).join(' · ')

  // ---------- left column: header + menu ----------
  const menu = (
    <div className="space-y-5">
      <div className="hero relative overflow-hidden px-5 pt-7 pb-5 text-center">
        <button onClick={() => open('goal')} className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20">
          {IC.edit} {tx('Изменить', 'Edit')}
        </button>
        <div className="mx-auto w-fit">
          <Avatar user={{ ...user!, name: displayName }} size={88} />
        </div>
        <div className="mt-3 text-xl font-bold">{displayName}</div>
        {user?.email && <div className="truncate text-sm text-navy-muted">{user.email}</div>}
        <div className="mt-2 text-sm text-navy-ink/90">{statusLine}</div>
        <div className="mt-3 flex justify-center gap-2">
          <span title={tx('Дней подряд с ответами', 'Days in a row with answers')} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${streak.days ? 'bg-warn/25 text-white' : 'bg-white/10 text-navy-muted'}`}>
            <span className={streak.days ? 'text-warn' : ''}>{IC.fire}</span>
            {streak.days} {daysWord(streak.days)} {tx('подряд', 'streak')}
          </span>
          {myRank > 0 && (
            <button onClick={() => open('leaders')} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">
              🏆 #{myRank}
            </button>
          )}
        </div>
        {streak.days > 0 && !streak.today && <div className="mt-2 text-xs text-warn">{tx('Ответьте сегодня, чтобы не потерять серию', 'Answer today to keep your streak')}</div>}
      </div>

      {weakest && (
        <div className="card flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-bad">{tx('Слабая тема', 'Weak topic')}</div>
            <div className="truncate text-sm font-semibold">{weakest[0]}</div>
            <div className="text-xs text-muted">
              {pct(weakest[1])}% · {weakest[1].correct}/{weakest[1].total}
            </div>
          </div>
          <Button className="shrink-0 px-3 py-2 text-sm" onClick={() => start('practice', { tags: [weakest[0]], count: 10 })}>
            {tx('Прокачать', 'Train')}
          </Button>
        </div>
      )}

      <Group title={tx('Моя подготовка', 'My preparation')}>
        <Row icon={IC.stats} tile="bg-process" label={titles.stats} value={ov.total ? `${ov.total} · ${pct(ov)}%` : '—'} onClick={() => open('stats')} active={shown === 'stats'} />
        <Row icon={IC.goal} tile="bg-accent-2" label={titles.goal} value={data.profile.examDate ? `${data.profile.targetCert ?? 'PMP'} · ${fmtDate(data.profile.examDate)} · ${target}%` : tx('не задана', 'not set')} onClick={() => open('goal')} active={section === 'goal'} />
        <Row icon={IC.history} tile="bg-business" label={titles.history} value={`${data.sessions.length} ${sessionsWord(lang, data.sessions.length)}`} onClick={() => open('history')} active={section === 'history'} />
        <Row icon={IC.saved} tile="bg-people" label={titles.saved} value={`${mistakes.length} · ${bookmarks.length}`} onClick={() => open('saved')} active={section === 'saved'} />
      </Group>

      <Group title={tx('Сообщество', 'Community')}>
        <Row icon={IC.leaders} tile="bg-warn" label={titles.leaders} value={myRank ? tx(`${myRank}-е место`, `#${myRank}`) : '—'} onClick={() => open('leaders')} active={section === 'leaders'} />
      </Group>

      <Group title={tx('Настройки', 'Settings')}>
        <Row icon={IC.reminders} tile="bg-bad" label={titles.reminders} value={notifState === 'granted' ? `${remTime} · ${tx('вкл', 'on')}` : remTime} onClick={() => open('reminders')} active={section === 'reminders'} />
        <Row icon={IC.lang} tile="bg-accent" label={tx('Язык', 'Language')} value={lang === 'ru' ? 'Русский' : 'English'} onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} chevron={false} />
        <Row
          icon={IC.theme}
          tile="bg-navy-2"
          label={tx('Тема', 'Theme')}
          value={themeLabel[theme]}
          onClick={() => {
            const n = nextTheme[theme]
            setTheme(n)
            setThemeState(n)
          }}
          chevron={false}
        />
        <Row icon={IC.export} tile="bg-ok" label={titles.export} value="JSON · CSV" onClick={() => open('export')} active={section === 'export'} />
      </Group>

      <Group>
        {backend.kind !== 'claude' && <Row icon={IC.logout} tile="bg-bad" label={t('signOut')} onClick={signOut} danger chevron={false} />}
        <Row icon={IC.back} tile="bg-muted" label={t('backHome')} onClick={onHome} chevron={false} />
      </Group>
      <p className="px-4 text-center text-xs text-muted">
        {t('signedInAs')}: {user?.provider === 'google' ? 'Google' : user?.provider === 'claude' ? 'Claude' : tx('локальный режим', 'local mode')}
      </p>
    </div>
  )

  // ---------- right column: section content ----------
  const qTitle = (q: Question) => {
    const L = localizeQuestion(q, lang)
    // the case text says more than the generic final question ("What should the PM do?")
    return L.stem.trim().split('\n').filter(Boolean)[0] || L.stem
  }

  const content: Record<Section, ReactNode> = {
    stats: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('answered')} value={ov.total} sub={`${data.sessions.length} ${sessionsWord(lang, data.sessions.length)}`} />
          <Stat label={t('accuracy')} value={`${pct(ov)}%`} sub={avgMs ? `${t('avgTime')}: ${Math.round(avgMs / 1000)} ${t('sec')} · ${t('pace')} ${Math.round(PACE_MS / 1000)} ${t('sec')}` : <Bar value={pct(ov)} tone={toneFor(pct(ov), ov.total)} />} />
          <Stat label={t('readiness')} value={rd.avg === null ? '—' : `${rd.avg}%`} sub={rd.avg === null ? t('noExams') : rd.exams.map((e) => Math.round(e) + '%').join(' · ')} />
          <Stat label={t('daysLeft')} value={daysLeft === null ? '—' : daysLeft} sub={data.profile.examDate ?? t('noGoal')} />
        </div>
        <section className="card p-5">
          <h3 className="mb-3 font-bold">{t('byDomain')}</h3>
          {(['people', 'process', 'business'] as Domain[]).map((d) => {
            const a = byDomain[d]
            const p = pct(a)
            return (
              <div key={d} className="mb-2.5">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t(d)}</span>
                  <span className="tabular-nums text-muted">{a.total ? `${p}% · ${a.correct}/${a.total}` : '—'}</span>
                </div>
                <Bar value={p} tone={toneFor(p, a.total)} />
              </div>
            )
          })}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-semibold text-bad">{t('weakAreas')}</div>
              {weak.length ? weak.map(([k, a]) => <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="ml-2 tabular-nums text-muted">{pct(a)}%</span></div>) : <div className="text-muted">{t('noData')}</div>}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-ok">{t('strongAreas')}</div>
              {strong.length ? strong.map(([k, a]) => <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="ml-2 tabular-nums text-muted">{pct(a)}%</span></div>) : <div className="text-muted">—</div>}
            </div>
          </div>
        </section>
        <section className="card p-5">
          <h3 className="mb-3 font-bold">{t('last14')}</h3>
          <div className="flex h-32 items-end gap-1">
            {daily.map((d) => {
              const h = (d.total / maxDay) * 100
              const p = d.total ? Math.round((d.correct / d.total) * 100) : 0
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.correct}/${d.total}`}>
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-t bg-surface-2" style={{ height: `${h}%` }}>
                    <div className={`w-full ${p >= 75 ? 'bg-ok' : p >= 55 ? 'bg-warn' : 'bg-bad'}`} style={{ height: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>{daily[0].day.slice(5)}</span>
            <span>{daily[daily.length - 1].day.slice(5)}</span>
          </div>
        </section>
        <section className="card p-5">
          <h3 className="mb-3 font-bold">{t('bySource')}</h3>
          {Object.entries(bySource)
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
            .map(([k, a]) => (
              <div key={k} className="mb-2">
                <div className="mb-0.5 flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="tabular-nums text-muted">
                    {pct(a)}% · {a.correct}/{a.total}
                  </span>
                </div>
                <Bar value={pct(a)} tone={toneFor(pct(a), a.total)} />
              </div>
            ))}
          {!Object.keys(bySource).length && <p className="text-sm text-muted">—</p>}
        </section>
      </div>
    ),

    goal: (
      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{tx('Изменения сохраняются автоматически.', 'Changes are saved automatically.')}</p>
          {saved && <Badge tone="ok">{t('saved')}</Badge>}
        </div>
        <label className="block text-sm">
          <div className="mb-1 text-xs font-medium text-muted">{tx('Имя (видно в рейтинге)', 'Name (shown in leaderboard)')}</div>
          <input value={data.profile.name ?? ''} placeholder={user?.name} onChange={(e) => setProfile({ name: e.target.value || undefined })} className={field} />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-xs font-medium text-muted">{t('targetCert')}</div>
          <select value={data.profile.targetCert ?? 'PMP'} onChange={(e) => setProfile({ targetCert: e.target.value as 'PMP' })} className={field}>
            <option value="PMP">PMP</option>
            <option value="CAPM">CAPM</option>
            <option value="PMI_ACP">PMI-ACP</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <div className="mb-1 text-xs font-medium text-muted">{t('examDate')}</div>
            <input type="date" value={data.profile.examDate ?? ''} onChange={(e) => setProfile({ examDate: e.target.value || undefined })} className={field} />
          </label>
          <label className="block text-sm">
            <div className="mb-1 text-xs font-medium text-muted">{t('targetScore')}</div>
            <input type="number" min={1} max={100} value={data.profile.targetScore ?? ''} placeholder="75" onChange={(e) => setProfile({ targetScore: +e.target.value || undefined })} className={field} />
          </label>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{t('goalProgress')}</span>
            <span className="tabular-nums">
              {rd.avg ?? pct(ov)}% / {target}%
            </span>
          </div>
          <Bar value={((rd.avg ?? pct(ov)) / target) * 100} tone={toneFor(rd.avg ?? pct(ov), ov.total)} />
        </div>
      </section>
    ),

    history: (
      <section className="card divide-y divide-line overflow-hidden p-0 text-sm">
        {data.sessions.length ? (
          data.sessions.map((s) => {
            const sc = Math.round(s.scorePct ?? 0)
            return (
              <button key={s.id} onClick={() => onOpenSession(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/70">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${sc >= 75 ? 'bg-ok-soft text-ok' : sc >= 55 ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'}`}>{sc}%</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(s.mode)}</span>
                  <span className="block truncate text-xs text-muted">
                    {new Date(s.startedAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {Object.keys(s.answers).length}/{s.questionIds.length}
                  </span>
                </span>
                <span className="text-muted/60">{IC.chevron}</span>
              </button>
            )
          })
        ) : (
          <p className="p-5 text-muted">{t('noData')}</p>
        )}
      </section>
    ),

    saved: (() => {
      const list = savedTab === 'mistakes' ? mistakes : bookmarks
      return (
        <div className="space-y-3">
          <div className="flex rounded-full bg-surface-2 p-1 text-sm font-semibold">
            {(['mistakes', 'bookmarks'] as const).map((k) => (
              <button key={k} onClick={() => setSavedTab(k)} className={`flex-1 rounded-full px-3 py-1.5 transition ${savedTab === k ? 'bg-surface shadow' : 'text-muted'}`}>
                {k === 'mistakes' ? tx('Ошибки', 'Mistakes') : tx('Закладки', 'Bookmarks')} · {k === 'mistakes' ? mistakes.length : bookmarks.length}
              </button>
            ))}
          </div>
          {list.length > 0 && (
            <Button className="w-full" onClick={() => start(savedTab, { count: list.length })}>
              {tx(`Прогнать все (${list.length})`, `Practice all (${list.length})`)}
            </Button>
          )}
          <section className="card divide-y divide-line overflow-hidden p-0 text-sm">
            {list.length ? (
              list.map((q) => (
                <button key={q.id} onClick={() => setPeek(q)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2/70">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${q.domain === 'people' ? 'bg-people' : q.domain === 'process' ? 'bg-process' : 'bg-business'}`} />
                  <span className="line-clamp-2 min-w-0 flex-1">{qTitle(q)}</span>
                  <span className="shrink-0 text-xs text-muted">{q.source}</span>
                </button>
              ))
            ) : (
              <p className="p-5 text-muted">{savedTab === 'mistakes' ? tx('Ошибок нет — отлично!', 'No mistakes — great!') : tx('Добавляйте вопросы звёздочкой «В закладки» во время тренировки.', 'Star questions during practice to save them here.')}</p>
            )}
          </section>
        </div>
      )
    })(),

    leaders: (
      <section className="card p-5">
        <p className="mb-3 text-xs text-muted">{t('leaderboardHint')}</p>
        {leaders === null ? (
          <p className="text-sm text-muted">{t('loading')}</p>
        ) : board.length === 0 ? (
          <p className="text-sm text-muted">{t('noLeaders')}</p>
        ) : (
          <ol className="divide-y divide-line text-sm">
            {board.slice(0, 10).map((l, i) => {
              const me = l.uid === user?.id
              return (
                <li key={l.uid} className={`flex items-center gap-3 py-2.5 ${me ? 'font-semibold' : ''}`}>
                  <span className={`w-6 text-center tabular-nums ${i < 3 ? 'text-accent' : 'text-muted'}`}>{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                  {l.photo ? <img src={l.photo} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs">{l.name[0]}</span>}
                  <span className="min-w-0 flex-1 truncate">
                    {l.name}
                    {me && <span className="ml-1 text-xs font-normal text-muted">({t('you')})</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {l.correct}/{l.answered}
                  </span>
                  <span className="w-16 text-right tabular-nums">
                    {l.points} <span className="text-xs text-muted">{t('points')}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    ),

    reminders: (
      <section className="card p-5">
        <p className="mb-3 text-sm text-muted">{t('remindersHint')}</p>
        <label className="block text-sm">
          <div className="mb-1 text-xs font-medium text-muted">{t('reminderTime')}</div>
          <input type="time" value={remTime} onChange={(e) => setReminder(e.target.value)} className="w-40 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm" />
        </label>
        <div className="mt-3 flex flex-col gap-2">
          <a href={googleCalendarUrl(remTime, remTitle, remDetails)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface-2">
            {t('addGoogleCal')}
          </a>
          <Button variant="ghost" onClick={() => saveFile('pmp-trainer-reminder.ics', icsFile(remTime, remTitle, remDetails), 'text/calendar')}>
            {t('downloadIcs')}
          </Button>
          {notifState !== 'unsupported' && (
            <Button variant={notifState === 'granted' ? 'soft' : 'ghost'} disabled={notifState !== 'default'} onClick={async () => setNotifState(await requestNotifications())}>
              {notifState === 'granted' ? t('notifOn') : notifState === 'denied' ? t('notifDenied') : t('enableNotif')}
            </Button>
          )}
        </div>
      </section>
    ),

    export: (
      <section className="card space-y-3 p-5">
        <p className="text-sm text-muted">{tx('Скачайте все свои ответы и результаты: JSON — полная копия, CSV — таблица для Excel / Google Sheets.', 'Download all your answers and results: JSON is a full copy, CSV is a table for Excel / Google Sheets.')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => saveFile('pmp-progress.json', JSON.stringify(data, null, 2), 'application/json')}>
            {t('exportJson')}
          </Button>
          <Button variant="ghost" onClick={() => saveFile('pmp-progress.csv', toCSV(bank, data), 'text/csv')}>
            {t('exportCsv')}
          </Button>
        </div>
      </section>
    ),
  }

  const peekL = peek ? localizeQuestion(peek, lang) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="md:grid md:grid-cols-[340px_1fr] md:items-start md:gap-6">
        <div className={section ? 'hidden md:block' : ''}>{menu}</div>
        <div className={section ? '' : 'hidden md:block'}>
          <div className="mb-4 flex items-center gap-2">
            <button onClick={() => setSection(null)} className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-accent hover:bg-surface-2 md:hidden" aria-label={tx('Назад', 'Back')}>
              {IC.back}
            </button>
            <h2 className="text-xl font-bold">{titles[shown]}</h2>
          </div>
          {content[shown]}
        </div>
      </div>

      <Modal
        open={!!peek}
        onClose={() => setPeek(null)}
        title={peek ? `${t(peek.domain)} · ${peek.source}` : ''}
        wide
        footer={
          peek && (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => toggleBookmark(peek.id)}>
                {data.bookmarks.includes(peek.id) ? tx('Убрать из закладок', 'Remove bookmark') : tx('В закладки', 'Bookmark')}
              </Button>
            </div>
          )
        }
      >
        {peek && peekL && (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1 text-sm">
            <Stem text={peekL.stem} lang={lang} className="text-[15px] leading-relaxed" />
            <div className="rounded-xl bg-ok-soft p-3">
              <div className="text-xs font-medium text-muted">{t('correctAnswer')}</div>
              {peekL.options.filter((o) => o.correct).map((o) => (
                <div key={o.label} className="mt-1 font-semibold">
                  {o.label}. {o.text}
                </div>
              ))}
            </div>
            {peekL.explanation && <p className="leading-relaxed">{peekL.explanation}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
