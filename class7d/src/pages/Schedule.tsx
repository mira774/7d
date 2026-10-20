import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { useAuth } from '../lib/auth'
import { can, errMsg, ok } from '../lib/api'
import { useLive } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { Lesson } from '../lib/types'
import { ease, spring } from '../lib/motion'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
type Draft = Omit<Lesson, 'id'> & { id?: string }
const blank = (weekday: number, no: number): Draft => ({ weekday, lesson_no: no, subject: '', start_time: '08:30', end_time: '09:15', room: '', note: '' })

function LessonForm({ init, onClose }: { init: Draft; onClose: () => void }) {
  const [l, setL] = useState<Draft>({ ...init, start_time: init.start_time.slice(0, 5), end_time: init.end_time.slice(0, 5) })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle'); const [error, setError] = useState('')
  const up = (k: keyof Draft, v: string | number) => setL(x => ({ ...x, [k]: v }))
  async function submit(e: FormEvent) {
    e.preventDefault(); setStatus('loading'); setError('')
    const { id, ...row } = l
    const r = id ? await supabase.from('lessons').update(row).eq('id', id) : await supabase.from('lessons').insert(row)
    if (r.error) { setError(errMsg(new Error(r.error.message))); setStatus('idle'); return }
    setStatus('success'); setTimeout(onClose, 400)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="field" placeholder="Предмет" value={l.subject} onChange={e => up('subject', e.target.value)} required />
      <div className="grid grid-cols-3 gap-2">
        <input className="field" type="number" min={1} max={10} value={l.lesson_no} onChange={e => up('lesson_no', +e.target.value)} aria-label="Номер урока" />
        <input className="field" type="time" value={l.start_time} onChange={e => up('start_time', e.target.value)} aria-label="Начало" required />
        <input className="field" type="time" value={l.end_time} onChange={e => up('end_time', e.target.value)} aria-label="Конец" required />
      </div>
      <input className="field" placeholder="Кабинет" value={l.room} onChange={e => up('room', e.target.value)} />
      <input className="field" placeholder="Замена или изменение (необязательно)" value={l.note} onChange={e => up('note', e.target.value)} />
      <div aria-live="polite" className="min-h-5 text-sm text-danger">{error}</div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" status={status}>Сохранить</Button></div>
    </form>
  )
}

export function Schedule() {
  const edit = can(useAuth().profile, 'schedule')
  const js = new Date().getDay(); const [day, setDay] = useState(js >= 1 && js <= 6 ? js : 1)
  const [editing, setEditing] = useState<Draft | null>(null)
  const q = useLive(async () => ok(await supabase.from('lessons').select('*').order('lesson_no')) as Lesson[], ['lessons'])
  const list = (q.data ?? []).filter(l => l.weekday === day)
  async function remove(id: string) { const r = await supabase.from('lessons').delete().eq('id', id); if (!r.error) void q.reload() }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Расписание</h1>
        {edit && <Button onClick={() => setEditing(blank(day, (list[list.length - 1]?.lesson_no ?? 0) + 1))}><Plus size={16} />Добавить урок</Button>}</div>
      <div className="flex gap-1">{DAYS.map((d, i) => (
        <button key={d} onClick={() => setDay(i + 1)} className={`relative h-9 w-12 rounded-ctl text-sm transition-colors ${day === i + 1 ? 'text-white' : 'text-muted hover:text-fg'}`}>
          {day === i + 1 && <motion.span layoutId="day" transition={spring} className="absolute inset-0 rounded-ctl bg-accent" />}<span className="relative">{d}</span></button>))}</div>
      {q.error && <p className="text-sm text-danger">{q.error}</p>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={day} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease }}>
          {!q.data ? <div className="h-20 animate-pulse rounded-card bg-surface2" /> : !list.length ? <EmptyState icon={<CalendarDays />} title="В этот день уроков нет" hint={edit ? 'Добавьте уроки кнопкой сверху.' : undefined} /> : (
            <ul className="space-y-2">{list.map(l => (
              <li key={l.id} className="card lift flex items-center gap-4 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl bg-surface2 text-sm font-medium">{l.lesson_no}</span>
                <div className="min-w-0 flex-1"><p className="font-medium">{l.subject}</p><p className="text-sm text-muted">{l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)}{l.room && ` · каб. ${l.room}`}</p>{l.note && <p className="text-sm text-danger">{l.note}</p>}</div>
                {edit && <div className="flex gap-1"><button onClick={() => setEditing(l)} aria-label="Изменить" className="rounded-ctl p-1.5 text-muted hover:bg-surface2 hover:text-fg"><Pencil size={16} /></button>
                  <button onClick={() => void remove(l.id)} aria-label="Удалить" className="rounded-ctl p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button></div>}
              </li>))}</ul>)}
        </motion.div>
      </AnimatePresence>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Урок">{editing && <LessonForm key={editing.id ?? 'new'} init={editing} onClose={() => { setEditing(null); void q.reload() }} />}</Modal>
    </div>
  )
}
