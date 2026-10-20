import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ease } from '../lib/motion'

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease }}
      className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="text-muted">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
    </motion.div>
  )
}
