import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Button, Badge, Stem, Ring, toneFor, Icons } from '../components/ui'
import type { Question, Session } from '../types'
import { createSession } from '../logic/engine'

export function Result({ session, onHome, onStart }: { session: Session; onHome: () => void; onStart: () => void }) {
  const { t, bank, data, update, user } = useStore()
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])
  const qs = session.questionIds.map((id) => byId.get(id)).filter(Boolean) as Question[]
  const [open, setOpen] = useState(false)
  const right = qs.filter((q) => session.answers[q.id]?.correct).length
  const wrongIds = qs.filter((q) => !session.answers[q.id]?.correct).map((q) => q.id)
  const score = session.scorePct ?? 0
  const spent = Math.round(((session.finishedAt ?? Date.now()) - session.startedAt) / 60000)

  const retry = () => {
    const pool = bank.filter((q) => wrongIds.includes(q.id))
    const s = createSession(pool, data, 'practice', { domains: [], sources: [], tags: [], count: pool.length })
    if (!s) return
    update((d) => ({ ...d, current: { ...s, mode: 'mistakes' } }))
    onStart()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="card p-6 text-center sm:p-8">
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          {t('result')} · {t(session.mode)}
          {session.deadlineAt && session.finishedAt && session.finishedAt >= session.deadlineAt && <Badge tone="warn">{t('timeUpBadge')}</Badge>}
        </div>
        <div className="mt-4 flex justify-center">
          <Ring value={score} size={150} stroke={12} tone={toneFor(score)}>
            <div className={`text-5xl font-extrabold tabular-nums tracking-tight ${score >= 75 ? 'text-ok' : score >= 55 ? 'text-warn' : 'text-bad'}`}>{Math.round(score)}%</div>
          </Ring>
        </div>
        <div className="mt-3 text-sm text-muted">
          {right} / {qs.length} · {spent} min
        </div>
        <p className="mt-3 text-xs text-muted">{t('passHint')}</p>
        <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-2xl bg-accent-soft/60 p-3.5 text-left text-sm">
          <span className="mt-0.5 text-accent">{Icons.spark()}</span>
          <span><span className="font-semibold text-accent">{t('nextStep')}: </span>
          {score >= 75 ? t('nextHigh') : score >= 55 ? t('nextMid') : t('nextLow')}</span>
        </div>
        <div className="no-print mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="ghost" onClick={onHome}>
            {t('backHome')}
          </Button>
          {wrongIds.length > 0 && (
            <Button variant="soft" onClick={retry}>
              {t('retryWrong')} ({wrongIds.length})
            </Button>
          )}
          <Button variant="ghost" onClick={() => setOpen((o) => !o)}>
            {t('reviewAnswers')}
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            {t('printReport')}
          </Button>
        </div>
      </div>

      <div className="hidden print:block mt-4 text-sm text-muted">
        {user?.name} · {new Date(session.startedAt).toLocaleString()}
      </div>

      {(open || typeof window !== 'undefined') && (
        <div className={`mt-6 space-y-4 ${open ? '' : 'hidden print:block'}`}>
          {qs.map((q, i) => {
            const a = session.answers[q.id]
            return (
              <div key={q.id} className={`card border-l-4 p-5 ${a?.correct ? 'border-l-ok' : 'border-l-bad'}`}>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-ink">#{i + 1}</span>
                  <Badge tone={q.domain}>{t(q.domain)}</Badge>
                  <Badge tone={a ? (a.correct ? 'ok' : 'bad') : 'warn'}>{a ? (a.correct ? t('correct') : t('wrong')) : t('unanswered')}</Badge>
                </div>
                <Stem text={q.stem} className="text-sm" />
                {q.image && <img src={q.image} alt="" className="my-2 max-h-72 rounded-lg border border-line" />}
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((o) => {
                    const sel = a?.selected.includes(o.label)
                    return (
                      <li key={o.label} className={`rounded-lg px-3 py-1.5 ${o.correct ? 'bg-ok-soft' : sel ? 'bg-bad-soft' : ''}`}>
                        <span className="mr-2 font-semibold">{o.label}.</span>
                        {o.text}
                        {o.correct && <span className="ml-2 text-xs text-ok">✓ {t('correctAnswer')}</span>}
                        {sel && !o.correct && <span className="ml-2 text-xs text-bad">({t('yourAnswer')})</span>}
                      </li>
                    )
                  })}
                </ul>
                {q.explanation && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium text-ink">{t('explanation')}: </span>
                    {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
