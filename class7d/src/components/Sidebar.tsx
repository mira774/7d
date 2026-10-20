import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, BookOpenCheck, Library, CalendarDays, MessageCircle, Megaphone, Users, Settings, ShieldCheck, Sun, Moon, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { spring, springSoft } from '../lib/motion'

const items = [
  { to: '/dashboard', label: 'Главная', icon: Home },
  { to: '/homework', label: 'Домашние задания', icon: BookOpenCheck },
  { to: '/materials', label: 'Ответы и материалы', icon: Library },
  { to: '/schedule', label: 'Расписание', icon: CalendarDays },
  { to: '/chat', label: 'Чаты', icon: MessageCircle },
  { to: '/announcements', label: 'Объявления', icon: Megaphone },
  { to: '/classmates', label: 'Ученики', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

interface Props { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }
const firstVisit = !sessionStorage.getItem('nav-seen')

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: Props) {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const nav = profile?.role === 'owner' ? [...items, { to: '/admin', label: 'Люди и права', icon: ShieldCheck }] : items
  useEffect(() => { sessionStorage.setItem('nav-seen', '1') }, [])

  const content = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 flex h-10 items-center justify-between px-2">
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight">CLASS 7D</span>}
        <button onClick={onToggle} aria-label="Свернуть меню" className="hidden rounded-ctl p-1.5 text-muted hover:bg-surface2 hover:text-fg md:block">
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon }, i) => {
          const active = pathname === to || pathname.startsWith(to + '/')
          return (
            <motion.div key={to} initial={firstVisit ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }}
              transition={{ ...springSoft, delay: firstVisit ? i * 0.04 : 0 }}>
              <NavLink to={to} onClick={onClose} title={collapsed ? label : undefined}
                className={`relative flex h-10 items-center gap-3 rounded-ctl px-2.5 text-sm transition-colors ${active ? 'text-fg' : 'text-muted hover:bg-surface2/70 hover:text-fg'}`}>
                {active && <motion.span layoutId={`nav-bg-${mobileOpen ? 'm' : 'd'}`} transition={spring} className="absolute inset-0 rounded-ctl bg-surface2" />}
                {active && <motion.span layoutId={`nav-bar-${mobileOpen ? 'm' : 'd'}`} transition={spring} className="absolute -left-3 h-5 w-[3px] rounded-r bg-accent" />}
                <motion.span animate={{ scale: active ? 1.1 : 1 }} transition={spring} className="relative shrink-0"><Icon size={18} /></motion.span>
                {!collapsed && <span className="relative truncate">{label}</span>}
              </NavLink>
            </motion.div>
          )
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line pt-3">
        <button onClick={toggle} className="flex h-10 items-center gap-3 rounded-ctl px-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{!collapsed && (theme === 'dark' ? 'Светлая тема' : 'Тёмная тема')}
        </button>
        <button onClick={() => void signOut()} className="flex h-10 items-center gap-3 rounded-ctl px-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg">
          <LogOut size={18} />{!collapsed && 'Выйти'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <motion.aside initial={false} animate={{ width: collapsed ? 68 : 248 }} transition={springSoft}
        className="hidden shrink-0 overflow-hidden border-r border-line bg-surface md:block">{content}</motion.aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50 md:hidden" />
            <motion.aside key="drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={springSoft}
              className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line bg-surface md:hidden">{content}</motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
