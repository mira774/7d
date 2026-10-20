import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Backdrop } from './Backdrop'
import { ease } from '../lib/motion'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const section = useLocation().pathname.split('/')[1] // вложенные маршруты не перезапускают анимацию
  return (
    <div className="relative flex h-full"><Backdrop />
      <div className="relative z-10 flex h-full"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /></div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-line px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Открыть меню" className="-ml-2 rounded-ctl p-2 hover:bg-surface2"><Menu size={20} /></button>
          <span className="ml-2 text-[15px] font-semibold">CLASS 7D</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease }} className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
