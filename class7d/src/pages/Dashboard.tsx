import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, BookOpenCheck, Megaphone, Library } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ok } from '../lib/api'
import { useLive } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { Lesson, Post } from '../lib/types'
import { EmptyState } from '../components/EmptyState'
import { ease } from '../lib/motion'
import { fmtDate, todayStr } from '../lib/util'

function Block({ title, to, i, children }: { title: string; to: string; i: number; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease, delay: 0.07 * i }} className="card lift p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">{title}</h2><Link to={to} className="text-sm text-muted transition-colors hover:text-fg">Все</Link></div>
      {children}
    </motion.section>
  )
}
const skeleton = <div className="h-16 animate-pulse rounded-ctl bg-surface2" />

export function Dashboard() {
  const { profile } = useAuth(); const me = profile!
  const js = new Date().getDay(); const day = js === 0 ? 7 : js
  const posts = useLive(async () => ok(await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100)) as Post[], ['posts'])
  const lessons = useLive(async () => ok(await supabase.from('lessons').select('*').eq('weekday', day).order('lesson_no')) as Lesson[], ['lessons'], [day])
  const done = useLive(async () => (ok(await supabase.from('homework_done').select('post_id').eq('user_id', me.id)) as { post_id: string }[]).map(r => r.post_id), ['homework_done'], [me.id])
  const all = posts.data; const today = todayStr(); const doneSet = new Set(done.data ?? [])
  const hw = all?.filter(p => p.kind === 'homework' && !doneSet.has(p.id) && (!p.due_date || p.due_date >= today)).sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9')).slice(0, 5)
  const news = all?.filter(p => p.kind === 'news').sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at)).slice(0, 3)
  const ans = all?.filter(p => p.kind === 'answer').slice(0, 4)
  const first = (me.full_name || me.login).split(' ')[0]
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>
        <h1 className="text-2xl font-semibold tracking-tight">Привет, {first}</h1>
        <p className="mt-1 text-sm text-muted">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </motion.div>
      {(posts.error || lessons.error) && <p className="rounded-ctl border border-danger/40 p-3 text-sm text-danger">Не удалось загрузить данные: {posts.error || lessons.error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Block title="Расписание на сегодня" to="/schedule" i={0}>
          {!lessons.data ? skeleton : !lessons.data.length ? <EmptyState icon={<CalendarDays />} title="Сегодня уроков нет" hint="Расписание добавляет владелец или модератор." /> : (
            <ul className="space-y-2">{lessons.data.map(l => (
              <li key={l.id} className="flex items-baseline gap-3 text-sm"><span className="w-24 shrink-0 tabular-nums text-muted">{l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)}</span><span>{l.subject}</span>
                {l.room && <span className="text-muted">каб. {l.room}</span>}{l.note && <span className="text-danger">{l.note}</span>}</li>))}</ul>)}
        </Block>
        <Block title="Ближайшие задания" to="/homework" i={1}>
          {!hw ? skeleton : !hw.length ? <EmptyState icon={<BookOpenCheck />} title="Нет невыполненных заданий" /> : (
            <ul className="space-y-1">{hw.map(h => (
              <li key={h.id}><Link to="/homework" className="flex justify-between gap-3 rounded-ctl px-2 py-1.5 text-sm transition-colors hover:bg-surface2"><span className="truncate"><span className="text-muted">{h.subject}</span> {h.title}</span><span className="shrink-0 tabular-nums text-muted">{h.due_date && fmtDate(h.due_date)}</span></Link></li>))}</ul>)}
        </Block>
        <Block title="Объявления" to="/announcements" i={2}>
          {!news ? skeleton : !news.length ? <EmptyState icon={<Megaphone />} title="Объявлений пока нет" /> : (
            <ul className="space-y-3">{news.map(n => (<li key={n.id}><p className="text-sm font-medium">{n.title}</p><p className="line-clamp-2 text-sm text-muted">{n.body}</p></li>))}</ul>)}
        </Block>
        <Block title="Новые ответы и материалы" to="/materials" i={3}>
          {!ans ? skeleton : !ans.length ? <EmptyState icon={<Library />} title="Материалов пока нет" /> : (
            <ul className="space-y-2">{ans.map(m => (<li key={m.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{m.title}</span><span className="shrink-0 text-muted">{m.subject}</span></li>))}</ul>)}
        </Block>
      </div>
    </div>
  )
}
