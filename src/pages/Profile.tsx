import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { sessionsWord } from '../i18n'
import { Avatar, Badge, Bar, Button, Stat, toneFor } from '../components/ui'
import { accuracyBy, accuracyByDomain, dailySeries, overall, pct, readiness, toCSV, avgAnswerMs, isoWeek, weeklyStats, PACE_MS } from '../logic/engine'
import { googleCalendarUrl, icsFile, notificationsSupported, requestNotifications } from '../reminders'
import { saveFile } from '../download'
import type { Domain, LeaderEntry, Session } from '../types'

export function Profile({ onOpenSession, onHome }: { onOpenSession: (s: Session) => void; onHome: () => void }) {
  const { t, user, data, bank, update, signOut, backend, lang } = useStore()
  const [saved, setSaved] = useState(false)
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null)
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
  const remTitle = lang === 'ru' ? 'PMP Тренажёр — 10 вопросов' : 'PMP Trainer — 10 questions'
  const remDetails = lang === 'ru' ? 'Ежедневная тренировка: практика или повторение ошибок.' : 'Daily practice: new questions or mistake review.'
  const setReminder = (v: string) => {
    setRemTime(v)
    try {
      localStorage.setItem('pmp.reminderTime', v)
    } catch {
      /* ignore */
    }
  }
  const ov = overall(data)
  const rd = readiness(data)
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

  const setProfile = (patch: Partial<typeof data.profile>) => {
    update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  const field = 'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm'

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* identity */}
      <div className="mb-5 flex flex-wrap items-center gap-4 card p-5">
        <Avatar user={user!} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold">{user?.name}</div>
          {user?.email && <div className="truncate text-sm text-muted">{user.email}</div>}
          <div className="mt-1 text-xs text-muted">
            {t('signedInAs')}: {user?.provider === 'google' ? 'Google' : user?.provider === 'claude' ? 'Claude' : lang === 'ru' ? 'локальный режим' : 'local mode'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onHome}>
            {t('backHome')}
          </Button>
          {backend.kind !== 'claude' && (
            <Button variant="ghost" onClick={signOut}>
              {t('signOut')}
            </Button>
          )}
        </div>
      </div>

      {/* summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('answered')} value={ov.total} sub={`${data.sessions.length} ${sessionsWord(lang, data.sessions.length)}`} />
        <Stat label={t('accuracy')} value={`${pct(ov)}%`} sub={avgMs ? `${t('avgTime')}: ${Math.round(avgMs / 1000)} ${t('sec')} · ${t('pace')} ${Math.round(PACE_MS / 1000)} ${t('sec')}` : <Bar value={pct(ov)} tone={toneFor(pct(ov), ov.total)} />} />
        <Stat label={t('readiness')} value={rd.avg === null ? '—' : `${rd.avg}%`} sub={rd.avg === null ? t('noExams') : rd.exams.map((e) => Math.round(e) + '%').join(' · ')} />
        <Stat label={t('daysLeft')} value={daysLeft === null ? '—' : daysLeft} sub={data.profile.examDate ?? t('noGoal')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* goal */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{t('yourData')}</h2>
            {saved && <Badge tone="ok">{t('saved')}</Badge>}
          </div>
          <div className="space-y-3">
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
          </div>
        </section>

        {/* weak / strong */}
        <section className="card p-5">
          <h2 className="mb-3 font-bold">{t('byDomain')}</h2>
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
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">{t('last14')}</h2>
          <div className="flex h-36 items-end gap-1">
            {daily.map((d) => {
              const h = (d.total / maxDay) * 100
              const p = d.total ? Math.round((d.correct / d.total) * 100) : 0
              return (
                <div key={d.day} className="group relative flex flex-1 flex-col justify-end" title={`${d.day}: ${d.correct}/${d.total}`}>
                  <div className="w-full rounded-t bg-surface-2" style={{ height: `${h}%` }}>
                    <div className={`w-full rounded-t ${p >= 75 ? 'bg-ok' : p >= 55 ? 'bg-warn' : 'bg-bad'}`} style={{ height: `${p}%` }} />
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
          <h2 className="mb-3 font-bold">{t('bySource')}</h2>
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* leaderboard */}
        <section className="card p-5">
          <h2 className="font-bold">{t('leaderboard')}</h2>
          <p className="mb-3 text-xs text-muted">{t('leaderboardHint')}</p>
          {leaders === null ? (
            <p className="text-sm text-muted">{t('loading')}</p>
          ) : leaders.length === 0 && mine.answered === 0 ? (
            <p className="text-sm text-muted">{t('noLeaders')}</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {(() => {
                const list = leaders.slice()
                if (user && mine.answered > 0 && !list.some((l) => l.uid === user.id)) list.push({ uid: user.id, name: user.name, photo: user.photo, week, ...mine, updatedAt: Date.now() })
                list.sort((a, b) => b.points - a.points)
                return list.slice(0, 10).map((l, i) => {
                  const me = l.uid === user?.id
                  return (
                    <li key={l.uid} className={`flex items-center gap-3 py-2 ${me ? 'font-semibold' : ''}`}>
                      <span className={`w-6 text-center tabular-nums ${i < 3 ? 'text-accent' : 'text-muted'}`}>{i + 1}</span>
                      {l.photo ? <img src={l.photo} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs">{l.name[0]}</span>}
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
                })
              })()}
            </ol>
          )}
        </section>

        {/* reminders */}
        <section className="card p-5">
          <h2 className="font-bold">{t('reminders')}</h2>
          <p className="mb-3 text-xs text-muted">{t('remindersHint')}</p>
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
              <Button
                variant={notifState === 'granted' ? 'soft' : 'ghost'}
                disabled={notifState !== 'default'}
                onClick={async () => setNotifState(await requestNotifications())}
              >
                {notifState === 'granted' ? t('notifOn') : notifState === 'denied' ? t('notifDenied') : t('enableNotif')}
              </Button>
            )}
          </div>
        </section>
      </div>

      {/* history */}
      <section className="mt-4 card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t('results')}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => saveFile('pmp-progress.json', JSON.stringify(data, null, 2), 'application/json')}>
              {t('exportJson')}
            </Button>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => saveFile('pmp-progress.csv', toCSV(bank, data), 'text/csv')}>
              {t('exportCsv')}
            </Button>
          </div>
        </div>
        {data.sessions.length ? (
          <div className="divide-y divide-line text-sm">
            {data.sessions.map((s) => {
              const sc = Math.round(s.scorePct ?? 0)
              return (
                <button key={s.id} onClick={() => onOpenSession(s)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-surface-2/60">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge tone="accent">{t(s.mode)}</Badge>
                    <span className="truncate text-muted">{new Date(s.startedAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 tabular-nums">
                    <span className="text-muted">{Object.keys(s.answers).length}/{s.questionIds.length}</span>
                    <span className={`w-12 text-right font-semibold ${sc >= 75 ? 'text-ok' : sc >= 55 ? 'text-warn' : 'text-bad'}`}>{sc}%</span>
                    <span className="text-xs text-accent">{t('openReview')} →</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('noData')}</p>
        )}
      </section>
    </div>
  )
}
