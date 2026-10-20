import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { spring } from '../lib/motion'

type Status = 'idle' | 'loading' | 'success'
interface Props {
  children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; status?: Status
  disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; className?: string
}

export function Button({ children, variant = 'primary', status = 'idle', disabled, type = 'button', onClick, className = '' }: Props) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const styles = {
    primary: 'sheen bg-accent text-white hover:brightness-110 hover:shadow-[0_8px_24px_-8px_rgb(var(--accent)/.7)]',
    ghost: 'border border-line text-fg hover:bg-surface2 hover:border-muted/50',
    danger: 'border border-danger/50 text-danger hover:bg-danger/10',
  }[variant]
  function down(e: PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect(); const id = Date.now() + Math.random()
    setRipples(x => [...x.slice(-3), { id, x: e.clientX - r.left, y: e.clientY - r.top }])
    setTimeout(() => setRipples(x => x.filter(i => i.id !== id)), 600)
  }
  return (
    <motion.button type={type} onClick={onClick} onPointerDown={down} disabled={disabled || status === 'loading'}
      whileHover={{ y: -1.5 }} whileTap={{ scale: variant === 'primary' ? 0.96 : 0.98 }} transition={spring}
      className={`relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-ctl px-4 text-sm font-medium transition-[background-color,border-color,box-shadow,filter] disabled:pointer-events-none disabled:opacity-50 ${styles} ${className}`}>
      {ripples.map(r => (
        <motion.span key={r.id} initial={{ scale: 0, opacity: 0.4 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: 0.55 }}
          className="pointer-events-none absolute h-40 w-40 rounded-full bg-white/40" style={{ left: r.x - 80, top: r.y - 80 }} />
      ))}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="relative inline-flex items-center gap-2">
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'success' && <Check className="h-4 w-4" />}
          {status === 'idle' && children}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
