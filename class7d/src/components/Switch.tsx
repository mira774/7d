import { motion } from 'framer-motion'
import { spring } from '../lib/motion'
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? 'justify-end bg-accent' : 'justify-start bg-surface2 ring-1 ring-line'}`}>
      <motion.span layout transition={spring} className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}
