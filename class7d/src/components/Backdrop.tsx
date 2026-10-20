import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

// У каждого раздела свой оттенок фона; при смене раздела слои плавно перетекают друг в друга.
const HUES: Record<string, [number, number, number]> = {
  dashboard: [235, 270, 200], homework: [265, 310, 230], materials: [165, 200, 140], schedule: [200, 230, 175],
  announcements: [25, 345, 280], chat: [210, 250, 190], classmates: [190, 220, 260], admin: [280, 320, 240], settings: [225, 250, 200],
}
const g = (h: number) => `radial-gradient(circle at center, hsl(${h} 90% 62% / .32), transparent 65%)`

export function Backdrop() {
  const section = useLocation().pathname.split('/')[1] || 'dashboard'
  const [a, b, c] = HUES[section] ?? HUES.dashboard
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <AnimatePresence>
        <motion.div key={section} className="absolute inset-0" style={{ opacity: 'var(--blob-o)' as unknown as number }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <div className="blob blob-a" style={{ background: g(a) }} />
          <div className="blob blob-b" style={{ background: g(b) }} />
          <div className="blob blob-c" style={{ background: g(c) }} />
        </motion.div>
      </AnimatePresence>
      <div className="dotgrid absolute inset-0" />
    </div>
  )
}
