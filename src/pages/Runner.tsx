import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { Button, Badge, Stem, Icons, Modal } from '../components/ui'
import { finishSession, isExpired, recordAnswer } from '../logic/engine'
import type { Answer, Question, Session } from '../types'

/** One question: stem, image, options, feedback. Used inline and inside the modal. */
function QuestionView({
  q,
  selected,
  answered,
  showFeedback,
  onPick,
  bookmarked,
  onBookmark,
}: {
  q: Question
  selected: string[]
  answered?: Answer
  showFeedback: boolean
  onPick: (label: string) => void
  bookmarked: boolean
  onBookmark: () => void
}) {
  const { t, lang } = useStore()
  const stemRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  const [readOpen, setReadOpen] = useState(false)
  useEffect(() => {
    const el = stemRef.current
    if (!el) return
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 4)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [q.id])
  const readLabel = lang === 'ru' ? 'Читать полностью' : 'Read in full'
  // keep the actual question (last line ending with "?") always visible under the scrolling case text
  const lines = q.stem.trimEnd().split('\n')
  const last = lines[lines.length - 1]?.trim() ?? ''
  const hasAsk = lines.length > 1 && /\?\s*$/.test(last)
  const body = hasAsk ? lines.slice(0, -1).join('\n') : q.stem
  const ask = hasAsk ? last : ''
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone={q.domain}>{t(q.domain)}</Badge>
        <span>{q.source}</span>
        {q.type === 'multiple' && <Badge tone="warn">multiple</Badge>}
        <button onClick={onBookmark} className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${bookmarked ? 'bg-warn-soft text-warn' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}>
          {Icons.star(undefined, bookmarked)} {bookmarked ? t('bookmarked') : t('bookmark')}
        </button>
      </div>
      {/* fixed-height stem: long case studies scroll inside, or open in a modal */}
      <div className="relative">
        <div ref={stemRef} className="stem-box max-h-48 overflow-y-auto pr-2 sm:max-h-56">
          <Stem text={body} className="text-[15px] leading-relaxed sm:text-base" />
          {q.image && <img src={q.image} alt="" className="my-3 max-h-80 w-auto rounded-xl border border-line" />}
        </div>
        {overflow && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" />
            <button onClick={() => setReadOpen(true)} className="absolute right-2 bottom-1 flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-bg shadow hover:brightness-110">
              {readLabel}
            </button>
          </>
        )}
      </div>
      {ask && <p className="mt-3 text-[15px] font-semibold leading-snug sm:text-base">{ask}</p>}
      <Modal open={readOpen} onClose={() => setReadOpen(false)} title={t('question')} wide>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <Stem text={q.stem} className="text-[15px] leading-relaxed sm:text-base" />
          {q.image && <img src={q.image} alt="" className="my-3 max-h-96 w-auto rounded-xl border border-line" />}
        </div>
      </Modal>

      <div className="mt-4 space-y-2">
        {q.options.map((o) => {
          const sel = selected.includes(o.label)
          let cls = 'border-line bg-surface hover:border-accent hover:bg-accent-soft/40'
          let pill = 'bg-surface-2 text-muted'
          if (showFeedback) {
            if (o.correct) {
              cls = 'border-ok bg-ok-soft'
              pill = 'bg-ok text-white'
            } else if (sel) {
              cls = 'border-bad bg-bad-soft'
              pill = 'bg-bad text-white'
            } else cls = 'border-line bg-surface opacity-60'
          } else if (sel) {
            cls = 'border-accent bg-accent-soft ring-2 ring-accent/30'
            pill = 'bg-accent text-accent-ink'
          }
          return (
            <button key={o.label} onClick={() => onPick(o.label)} disabled={showFeedback} className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] leading-snug transition ${cls}`}>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pill}`}>{o.label}</span>
              <span>{o.text}</span>
            </button>
          )
        })}
      </div>

      {showFeedback && answered && (
        <div className={`feedback mt-4 rounded-2xl p-4 text-sm ${answered.correct ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
          <div className={`mb-1.5 flex items-center gap-1.5 font-bold ${answered.correct ? 'text-ok' : 'text-bad'}`}>
            {answered.correct ? Icons.check() : Icons.x()} {answered.correct ? t('correct') : t('wrong')}
          </div>
          {q.explanation && (
            <p className="text-ink/90">
              <span className="font-medium">{t('explanation')}: </span>
              {q.explanation}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export function Runner({ onDone, onExit }: { onDone: (s: Session) => void; onExit: () => void }) {
  const { t, data, bank, update, lang } = useStore()
  const s = data.current!
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])
  const questions = useMemo(() => s.questionIds.map((id) => byId.get(id)).filter(Boolean) as Question[], [s.questionIds, byId])
  const firstUnanswered = questions.findIndex((q) => !s.answers[q.id])
  const [idx, setIdx] = useState(firstUnanswered === -1 ? 0 : firstUnanswered)
  const [selected, setSelected] = useState<string[]>([])
  const [now, setNow] = useState(Date.now())
  const [listOpen, setListOpen] = useState(false)
  const [modalIdx, setModalIdx] = useState<number | null>(null)
  const [modalSel, setModalSel] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const instant = s.mode !== 'exam'

  const q = questions[idx]
  const answered = q ? s.answers[q.id] : undefined

  useEffect(() => {
    setSelected(answered?.selected ?? [])
  }, [idx, answered])

  useEffect(() => {
    if (modalIdx === null) return
    const mq = questions[modalIdx]
    setModalSel(mq ? (s.answers[mq.id]?.selected ?? []) : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalIdx])

  // countdown display; the deadline itself is fixed at session creation
  useEffect(() => {
    if (!s.deadlineAt) return
    const h = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(h)
  }, [s.deadlineAt])

  useEffect(() => {
    if (s.deadlineAt && isExpired(s, now)) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  if (!q) {
    return (
      <div className="p-6 text-center">
        <p>{t('nothingToTrain')}</p>
        <Button className="mt-4" onClick={onExit}>
          {t('backHome')}
        </Button>
      </div>
    )
  }

  const pickFor = (target: Question, current: string[], setter: (v: string[]) => void) => (label: string) => {
    if (instant && s.answers[target.id]) return
    const next = target.type === 'single' ? [label] : current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
    setter(next)
    // exam mode: autosave on every change, can be revised until submit
    if (!instant && next.length) update((d) => recordAnswer(d, d.current!, target, next).data)
  }

  const submitFor = (target: Question, sel: string[]) => {
    if (!sel.length) return
    if (isExpired(s)) return finish()
    update((d) => recordAnswer(d, d.current!, target, sel).data)
  }

  function finish() {
    let done: Session | null = null
    update((d) => {
      const r = finishSession(d, d.current!)
      done = r.session
      return r.data
    })
    setConfirmOpen(false)
    setTimeout(() => onDone(done ?? { ...s, finishedAt: Date.now(), scorePct: 0 }), 0)
  }

  const toggleBookmark = (qq: Question) => () =>
    update((d) => ({ ...d, bookmarks: d.bookmarks.includes(qq.id) ? d.bookmarks.filter((b) => b !== qq.id) : [...d.bookmarks, qq.id] }))

  const left = s.deadlineAt ? Math.max(0, s.deadlineAt - now) : null
  const mm = left !== null ? Math.floor(left / 60000) : 0
  const ss = left !== null ? Math.floor((left % 60000) / 1000) : 0
  const answeredCount = Object.keys(s.answers).length
  const unanswered = questions.length - answeredCount
  const showFeedback = instant && !!answered
  const mq = modalIdx !== null ? questions[modalIdx] : null
  const mAnswered = mq ? s.answers[mq.id] : undefined

  const statusTone = (qq: Question): 'ok' | 'bad' | 'accent' | 'muted' => {
    const a = s.answers[qq.id]
    if (!a) return 'muted'
    if (!instant) return 'accent'
    return a.correct ? 'ok' : 'bad'
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge tone="accent">{t(s.mode)}</Badge>
          <span className="font-semibold tabular-nums">
            {idx + 1}
            <span className="font-normal text-muted">
              {' '}
              {t('of')} {questions.length}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {left !== null && (
            <span className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${left < 5 * 60000 ? 'bg-bad-soft text-bad' : 'bg-surface-2 text-ink'}`}>
              {mm}:{ss.toString().padStart(2, '0')}
            </span>
          )}
          <button onClick={() => setListOpen(true)} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-ink hover:bg-line" title={t('questionList')}>
            {Icons.bank()} <span className="hidden sm:inline">{t('questionList')}</span>
            <span className="tabular-nums text-muted">
              {answeredCount}/{questions.length}
            </span>
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" onClick={onExit} title={t('backHome')}>
            {Icons.x()}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-1">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)} aria-label={`${i + 1}`} className={`h-1.5 min-w-1 flex-1 rounded-full transition-colors ${i === idx ? 'bg-accent' : s.answers[qq.id] ? (instant ? (s.answers[qq.id].correct ? 'bg-ok' : 'bg-bad') : 'bg-accent/50') : 'bg-surface-2'}`} />
        ))}
      </div>

      <div className="card relative overflow-hidden p-5 sm:p-7">
        <div className={`absolute inset-y-0 left-0 w-1.5 ${q.domain === 'people' ? 'bg-people' : q.domain === 'process' ? 'bg-process' : 'bg-business'}`} />
        <QuestionView q={q} selected={selected} answered={answered} showFeedback={showFeedback} onPick={pickFor(q, selected, setSelected)} bookmarked={data.bookmarks.includes(q.id)} onBookmark={toggleBookmark(q)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          {t('prev')}
        </Button>
        <div className="flex gap-2">
          {instant && !answered ? (
            <Button onClick={() => submitFor(q, selected)} disabled={!selected.length}>
              {t('answer')}
            </Button>
          ) : null}
          {idx < questions.length - 1 ? (
            <Button variant={answered ? 'primary' : 'ghost'} onClick={() => setIdx((i) => i + 1)}>
              {t('next')} {Icons.arrow()}
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)}>{t('finish')}</Button>
          )}
        </div>
      </div>
      {idx < questions.length - 1 && (
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
            {t('finish')}
          </Button>
        </div>
      )}

      {/* question list */}
      <Modal open={listOpen} onClose={() => setListOpen(false)} title={t('questionList')} wide>
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted">
          <span>
            {t('answered')}: {answeredCount}
          </span>
          <span>·</span>
          <span>
            {t('unanswered')}: {unanswered}
          </span>
        </div>
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {questions.map((qq, i) => {
            const tone = statusTone(qq)
            const pill = { ok: 'bg-ok text-white', bad: 'bg-bad text-white', accent: 'bg-accent text-accent-ink', muted: 'bg-surface-2 text-muted' }[tone]
            return (
              <button
                key={qq.id}
                onClick={() => {
                  setListOpen(false)
                  setModalIdx(i)
                }}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-accent hover:bg-accent-soft/40 ${i === idx ? 'border-accent' : 'border-line'}`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${pill}`}>{i + 1}</span>
                <span className="line-clamp-2 flex-1 text-ink/90">{qq.stem.replace(/\|.*\|/g, ' ').replace(/\s+/g, ' ')}</span>
                <span className="shrink-0 text-muted">{Icons.arrow()}</span>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* read & answer one question in a modal */}
      <Modal
        open={mq !== null}
        onClose={() => setModalIdx(null)}
        title={mq ? `${t('question')} ${modalIdx! + 1} ${t('of')} ${questions.length}` : ''}
        wide
        footer={
          mq && (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setListOpen(true)
                  setModalIdx(null)
                }}
              >
                {t('questionList')}
              </Button>
              <div className="flex gap-2">
                {instant && !mAnswered ? (
                  <Button onClick={() => submitFor(mq, modalSel)} disabled={!modalSel.length}>
                    {t('answer')}
                  </Button>
                ) : null}
                <Button
                  variant={mAnswered || !instant ? 'primary' : 'ghost'}
                  onClick={() => {
                    setIdx(modalIdx!)
                    setModalIdx(null)
                  }}
                >
                  {lang === 'ru' ? 'Перейти к вопросу' : 'Go to question'}
                </Button>
              </div>
            </div>
          )
        }
      >
        {mq && (
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            <QuestionView q={mq} selected={modalSel} answered={mAnswered} showFeedback={instant && !!mAnswered} onPick={pickFor(mq, modalSel, setModalSel)} bookmarked={data.bookmarks.includes(mq.id)} onBookmark={toggleBookmark(mq)} />
          </div>
        )}
      </Modal>

      {/* finish confirmation */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('finish')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={finish}>{t('finishYes')}</Button>
          </div>
        }
      >
        <p className="text-sm">{t('finishConfirm')}</p>
        {unanswered > 0 && (
          <p className="mt-2 text-sm text-warn">
            {t('unanswered')}: {unanswered}
          </p>
        )}
      </Modal>
    </div>
  )
}
