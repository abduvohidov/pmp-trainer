import { useEffect, useMemo, useState } from 'react'
import { notify } from '../reminders'
import { useStore } from '../store'
import { sessionsWord } from '../i18n'
import { Button, Card, Badge, Bar, Icons, Ring, toneFor, Modal } from '../components/ui'
import type { Domain, Filters, Mode } from '../types'
import { accuracyByDomain, applyFilters, createSession, dueReviewIds, overall, pct, readiness, wrongQuestionIds, PMP_FULL } from '../logic/engine'

const MODES: { mode: Mode; icon: keyof typeof Icons; color: string }[] = [
  { mode: 'practice', icon: 'practice', color: 'text-process bg-process/12' },
  { mode: 'exam', icon: 'exam', color: 'text-accent-2 bg-accent-2/12' },
  { mode: 'mistakes', icon: 'mistakes', color: 'text-people bg-people/12' },
  { mode: 'review', icon: 'review', color: 'text-business bg-business/12' },
  { mode: 'bookmarks', icon: 'bookmarks', color: 'text-warn bg-warn/12' },
]

const DOM_BG: Record<Domain, string> = { people: 'bg-people', process: 'bg-process', business: 'bg-business' }

export function Dashboard({ onStart }: { onStart: () => void }) {
  const { t, data, bank, update, user, lang } = useStore()
  const [setup, setSetup] = useState<Mode | null>(null)

  const counts = useMemo(
    () => ({
      mistakes: wrongQuestionIds(data).filter((id) => bank.some((q) => q.id === id)).length,
      review: dueReviewIds(data).length,
      bookmarks: data.bookmarks.length,
      bank: bank.filter((q) => !q.archived).length,
    }),
    [data, bank],
  )
  const ov = overall(data)
  const rd = readiness(data)
  const byDomain = accuracyByDomain(bank, data)
  const daysLeft = data.profile.examDate ? Math.ceil((new Date(data.profile.examDate).getTime() - Date.now()) / 86_400_000) : null

  const lastExam = data.sessions.find((s) => s.mode === 'exam')
  const examStale = !lastExam || Date.now() - lastExam.startedAt > 5 * 86_400_000
  const reco: { key: 'recoNew' | 'recoMistakes' | 'recoReview' | 'recoExam' | 'recoKeep'; mode: Mode; count: number } =
    ov.total === 0
      ? { key: 'recoNew', mode: 'practice', count: 10 }
      : counts.review > 0
        ? { key: 'recoReview', mode: 'review', count: Math.min(counts.review, 20) }
        : counts.mistakes >= 3
          ? { key: 'recoMistakes', mode: 'mistakes', count: Math.min(counts.mistakes, 20) }
          : ov.total >= 30 && examStale
            ? { key: 'recoExam', mode: 'exam', count: 30 }
            : { key: 'recoKeep', mode: 'practice', count: 10 }
  const target = data.profile.targetScore ?? 75
  const current = rd.avg ?? pct(ov)

  // one browser notification per day when reviews are due (only if the user allowed notifications)
  useEffect(() => {
    if (!counts.review) return
    const key = 'pmp.notified.' + new Date().toISOString().slice(0, 10)
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      return
    }
    notify(t('notifTitle'), t('notifDue').replace('{n}', String(counts.review)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.review])

  const [notice, setNotice] = useState<string | null>(null)
  const start = (mode: Mode, f: Filters) => {
    const s = createSession(bank, data, mode, f)
    if (!s) {
      setNotice(t('nothingToTrain'))
      setSetup(mode)
      return
    }
    setNotice(null)
    update((d) => ({ ...d, current: s }))
    setSetup(null)
    onStart()
  }

  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* hero */}
      <section className="hero relative overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-sm text-navy-muted">
              {lang === 'ru' ? 'Подготовка к PMP' : 'PMP preparation'}
              {daysLeft !== null && ` · ${daysLeft} ${t('daysLeft')}`}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">
              {lang === 'ru' ? 'Привет' : 'Hi'}, {firstName}
            </h1>
            {data.current ? (
              <>
                <p className="mt-3 max-w-md text-navy-ink/85">
                  {t('resume')}: {t(data.current.mode)} · {Object.keys(data.current.answers).length}/{data.current.questionIds.length}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button className="py-3" onClick={onStart}>
                    {t('resume')} {Icons.arrow()}
                  </Button>
                  <Button variant="light" onClick={() => update((d) => ({ ...d, current: null }))}>
                    {t('abandon')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 max-w-md text-navy-ink/85">{t(reco.key)}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button className="py-3" onClick={() => start(reco.mode, { domains: [], sources: [], tags: [], count: reco.count, minutes: reco.mode === 'exam' ? 38 : undefined })}>
                    {reco.mode === 'practice' ? t('quickStart') : `${t('start')}: ${t(reco.mode)}`} {Icons.arrow()}
                  </Button>
                  {ov.total > 0 && (
                    <span className="text-sm text-navy-muted">
                      {t('goalProgress')}: <span className="font-semibold text-navy-ink">{current}%</span> / {target}%
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* domain triad — the signature */}
          <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm ring-1 ring-white/10">
            <div className="flex items-center gap-4">
              <Ring value={current} size={96} stroke={9} tone={toneFor(current, ov.total)}>
                <div className="text-center">
                  <div className="text-2xl font-extrabold leading-none tabular-nums">{ov.total ? `${current}%` : '—'}</div>
                  <div className="mt-0.5 text-[10px] text-navy-muted">{rd.avg !== null ? t('readiness') : t('accuracy')}</div>
                </div>
              </Ring>
              <div className="min-w-0 flex-1 space-y-2.5">
                {(['people', 'process', 'business'] as Domain[]).map((d) => {
                  const a = byDomain[d]
                  return (
                    <div key={d}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-navy-ink/90">{t(d)}</span>
                        <span className="tabular-nums text-navy-muted">{a.total ? `${pct(a)}%` : '—'}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${DOM_BG[d]} transition-all duration-700`} style={{ width: `${pct(a)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label={t('questionsInBank')} value={counts.bank} />
        <MiniStat label={t('answered')} value={ov.total} sub={`${data.sessions.length} ${sessionsWord(lang, data.sessions.length)}`} />
        <MiniStat label={t('accuracy')} value={ov.total ? `${pct(ov)}%` : '—'} />
        <MiniStat label={t('readiness')} value={rd.avg === null ? '—' : `${rd.avg}%`} sub={rd.avg === null ? t('noExams') : t('readinessHint')} />
      </div>

      {/* modes */}
      <h2 className="mt-8 mb-3 text-lg font-bold">{lang === 'ru' ? 'Режимы тренировки' : 'Training modes'}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map(({ mode, icon, color }) => {
          const n = mode === 'mistakes' ? counts.mistakes : mode === 'review' ? counts.review : mode === 'bookmarks' ? counts.bookmarks : null
          return (
            <Card key={mode} onClick={() => setSetup(mode)}>
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>{Icons[icon]()}</div>
                {n !== null && <Badge tone={n ? 'accent' : 'muted'}>{n}</Badge>}
              </div>
              <div className="mt-4 text-[17px] font-bold">{t(mode)}</div>
              <div className="mt-0.5 text-sm text-muted">{t(`${mode}Desc` as 'practiceDesc')}</div>
              <div className="mt-3 text-xs font-medium text-accent">{t(`${mode}When` as 'practiceWhen')}</div>
            </Card>
          )
        })}
      </div>

      {setup && <SetupModal mode={setup} notice={notice} onClose={() => { setSetup(null); setNotice(null) }} onStart={(f) => start(setup, f)} />}
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
    </div>
  )
}

function SetupModal({ mode, notice, onClose, onStart }: { mode: Mode; notice: string | null; onClose: () => void; onStart: (f: Filters) => void }) {
  const { t, bank } = useStore()
  const sources = useMemo(() => [...new Set(bank.map((q) => q.source))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [bank])
  const [domains, setDomains] = useState<Domain[]>([])
  const [srcs, setSrcs] = useState<string[]>([])
  const [count, setCount] = useState(mode === 'exam' ? 30 : 10)
  const [minutes, setMinutes] = useState(38)
  const [full, setFull] = useState(false)
  const [domInfo, setDomInfo] = useState(false)
  const available = mode === 'practice' || mode === 'exam' ? applyFilters(bank, { domains, sources: srcs }).length : null
  const fullCount = Math.min(PMP_FULL.questions, available ?? 0)
  const fullMinutes = Math.round((PMP_FULL.minutes * fullCount) / PMP_FULL.questions)
  const effCount = full ? fullCount : count
  const effMinutes = full ? fullMinutes : minutes
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const m = MODES.find((x) => x.mode === mode)!
  const field = 'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm'

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.color}`}>{Icons[m.icon]()}</div>
          <div>
            <h2 className="text-xl font-bold">{t(mode)}</h2>
            <p className="text-sm text-muted">{t(`${mode}Desc` as 'practiceDesc')}</p>
          </div>
        </div>

        {(mode === 'practice' || mode === 'exam') && (
          <>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                {t('domains')}
                <button type="button" onClick={() => setDomInfo(true)} aria-label="info" className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-muted/60 text-[10px] font-bold text-muted hover:border-accent hover:text-accent">
                  i
                </button>
              </div>
              <Modal open={domInfo} onClose={() => setDomInfo(false)} title={t('domains')}>
                <p className="text-sm leading-relaxed">{t('domainsInfo')}</p>
              </Modal>
              <div className="flex flex-wrap gap-2">
                {(['people', 'process', 'business'] as Domain[]).map((d) => (
                  <Chip key={d} active={domains.includes(d)} onClick={() => setDomains(toggle(domains, d))}>
                    {t(d)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-sm font-medium">{t('sources')}</div>
              <div className="flex flex-wrap gap-2">
                {sources.map((s) => (
                  <Chip key={s} active={srcs.includes(s)} onClick={() => setSrcs(toggle(srcs, s))}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'exam' && (
          <button onClick={() => setFull((f) => !f)} className={`mt-4 flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${full ? 'border-accent bg-accent-soft/60' : 'border-line hover:border-accent/50'}`}>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${full ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>{full && Icons.check('h-3.5 w-3.5')}</span>
            <span>
              <span className="font-semibold">{t('fullExam')}</span>
              <span className="mt-0.5 block text-xs text-muted">{t('fullExamDesc')}</span>
              {full && fullCount < PMP_FULL.questions && <span className="mt-1.5 block text-xs text-warn">{t('fullExamShort').replace('{n}', String(fullCount)).replace('{m}', String(fullMinutes))}</span>}
            </span>
          </button>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="mb-1.5 font-medium">{t('questionCount')}</div>
            <input type="number" min={1} max={300} value={effCount} disabled={full} onChange={(e) => setCount(Math.max(1, +e.target.value || 1))} className={`${field} disabled:opacity-60`} />
          </label>
          {mode === 'exam' && (
            <label className="text-sm">
              <div className="mb-1.5 font-medium">{t('minutes')}</div>
              <input type="number" min={1} max={300} value={effMinutes} disabled={full} onChange={(e) => setMinutes(Math.max(1, +e.target.value || 1))} className={`${field} disabled:opacity-60`} />
            </label>
          )}
        </div>
        {available !== null && (
          <p className="mt-2 text-xs text-muted">
            {t('all')}: {available}
          </p>
        )}
        {notice && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{notice}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {Icons.x()}
          </Button>
          <Button onClick={() => onStart({ domains, sources: srcs, tags: [], count: effCount, minutes: mode === 'exam' ? effMinutes : undefined, fullExam: mode === 'exam' && full })}>
            {t('start')} {Icons.arrow()}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:bg-surface-2'}`}>
      {children}
    </button>
  )
}
