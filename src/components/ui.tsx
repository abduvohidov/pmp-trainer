import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { TERMS, termText, type Term } from '../glossary'
import type { Lang } from '../i18n'
import type { Domain, UserInfo } from '../types'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' | 'light' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]'
  const v = {
    primary: 'btn-grad',
    soft: 'bg-accent-soft text-accent hover:brightness-95',
    ghost: 'bg-surface text-ink hover:bg-surface-2 border border-line',
    light: 'bg-white/10 text-white hover:bg-white/20 border border-white/15',
    danger: 'bg-bad-soft text-bad hover:brightness-95',
  }[variant]
  return <button className={`${base} ${v} ${className}`} {...props} />
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`card p-5 ${onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-accent/50' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {icon && <span className="text-accent">{icon}</span>}
      </div>
      <div className="mt-1 text-[28px] font-extrabold leading-none tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'bad' | 'warn' | 'accent' | Domain }) {
  const c = {
    muted: 'bg-surface-2 text-muted',
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    warn: 'bg-warn-soft text-warn',
    accent: 'bg-accent-soft text-accent',
    people: 'bg-people/15 text-people',
    process: 'bg-process/15 text-process',
    business: 'bg-business/15 text-business',
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>
}

/** A glossary term inside question text: dotted underline, definition on hover (title) and on click (popover). */
function TermChip({ term, text, lang }: { term: Term; text: string; lang: Lang }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <span className="relative inline">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        title={termText(term, lang)}
        className="cursor-help rounded-sm border-b border-dotted border-accent/70 text-inherit hover:bg-accent-soft/60"
      >
        {text}
      </button>
      {open && (
        <span onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full z-20 mt-1 block w-72 max-w-[80vw] rounded-xl border border-line bg-surface p-3 text-left text-xs font-normal leading-relaxed text-ink shadow-xl">
          <span className="mb-1 block font-bold text-accent">{text}</span>
          {termText(term, lang)}
        </span>
      )}
    </span>
  )
}

/** Wrap glossary terms in a plain string. */
export function RichText({ text, lang }: { text: string; lang: Lang }) {
  const out: ReactNode[] = []
  let rest = text
  let k = 0
  let guard = 0
  while (rest.length && guard++ < 200) {
    let best: { idx: number; len: number; term: Term } | null = null
    for (const term of TERMS) {
      const m = term.match.exec(rest)
      if (m && (best === null || m.index < best.idx || (m.index === best.idx && m[0].length > best.len))) best = { idx: m.index, len: m[0].length, term }
    }
    if (!best) break
    if (best.idx > 0) out.push(<span key={k++}>{rest.slice(0, best.idx)}</span>)
    out.push(<TermChip key={k++} term={best.term} text={rest.slice(best.idx, best.idx + best.len)} lang={lang} />)
    rest = rest.slice(best.idx + best.len)
  }
  if (rest) out.push(<span key={k++}>{rest}</span>)
  return <>{out}</>
}

/** Minimal renderer: paragraphs + pipe tables (used by a few EVM questions). */
export function Stem({ text, className = '', lang = 'ru' }: { text: string; className?: string; lang?: Lang }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim())
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      blocks.push(
        <table key={k++}>
          <thead>
            <tr>
              {head.map((h, j) => (
                <th key={j}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }
    if (line.trim())
      blocks.push(
        <p key={k++}>
          <RichText text={line} lang={lang} />
        </p>,
      )
    i++
  }
  return <div className={`stem ${className}`}>{blocks}</div>
}

export function Bar({ value, tone = 'accent', className = '' }: { value: number; tone?: 'accent' | 'ok' | 'bad' | 'warn' | Domain; className?: string }) {
  const c = { accent: 'bg-accent', ok: 'bg-ok', bad: 'bg-bad', warn: 'bg-warn', people: 'bg-people', process: 'bg-process', business: 'bg-business' }[tone]
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <div className={`h-full rounded-full ${c} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export const toneFor = (p: number, total = 1): 'ok' | 'warn' | 'bad' | 'accent' => (total === 0 ? 'accent' : p >= 75 ? 'ok' : p >= 55 ? 'warn' : 'bad')

/** Circular score ring. */
export function Ring({ value, size = 120, stroke = 10, tone = 'accent', children }: { value: number; size?: number; stroke?: number; tone?: 'ok' | 'warn' | 'bad' | 'accent'; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  const color = { ok: 'var(--color-ok)', warn: 'var(--color-warn)', bad: 'var(--color-bad)', accent: 'var(--color-accent)' }[tone]
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function Avatar({ user, size = 32 }: { user: UserInfo; size?: number }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return user.photo ? (
    <img src={user.photo} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover ring-2 ring-white/40" style={{ width: size, height: size }} />
  ) : (
    <span className="btn-grad flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, fontSize: size * 0.36, boxShadow: 'none' }}>
      {initials || '?'}
    </span>
  )
}

// ---- icons (24px, stroke) ----
const I = ({ d, className = '' }: { d: ReactNode; className?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {d}
  </svg>
)
export const Icons = {
  practice: (c?: string) => <I className={c} d={<><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13 7l4 4" /></>} />,
  exam: (c?: string) => <I className={c} d={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" /></>} />,
  mistakes: (c?: string) => <I className={c} d={<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>} />,
  review: (c?: string) => <I className={c} d={<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15l2 2 4-4" /></>} />,
  bookmarks: (c?: string) => <I className={c} d={<path d="M6 3h12v18l-6-4-6 4z" />} />,
  bank: (c?: string) => <I className={c} d={<><path d="M4 6h16M4 12h16M4 18h10" /></>} />,
  target: (c?: string) => <I className={c} d={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>} />,
  check: (c?: string) => <I className={c} d={<path d="M5 12l4 4L19 7" />} />,
  x: (c?: string) => <I className={c} d={<path d="M6 6l12 12M18 6L6 18" />} />,
  spark: (c?: string) => <I className={c} d={<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>} />,
  arrow: (c?: string) => <I className={c} d={<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>} />,
  star: (c?: string, filled = false) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={c} aria-hidden>
      <path d="M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3L2.8 9.7l6.4-.9z" />
    </svg>
  ),
}

/** Accessible in-app dialog (browser alert/confirm are blocked inside embedded pages). */
export function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title?: string; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="close">
            {Icons.x()}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
