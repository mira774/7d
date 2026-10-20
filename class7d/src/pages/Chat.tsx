import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { errMsg, ok } from '../lib/api'
import { useProfiles } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { Msg } from '../lib/types'
import { spring } from '../lib/motion'

const PAGE = 50
const sortMsgs = (a: Msg, b: Msg) => a.created_at.localeCompare(b.created_at)
const dayLabel = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const time = (s: string) => new Date(s).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export function Chat() {
  const { profile } = useAuth(); const me = profile!; const { names } = useProfiles()
  const [msgs, setMsgs] = useState<Msg[]>([]); const [ready, setReady] = useState(false); const [more, setMore] = useState(false)
  const [text, setText] = useState(''); const [err, setErr] = useState(''); const [sending, setSending] = useState(false)
  const box = useRef<HTMLDivElement>(null); const stick = useRef(true)
  const add = useCallback((m: Msg) => setMsgs(x => (x.some(y => y.id === m.id) ? x : [...x, m].sort(sortMsgs))), [])

  const loadLatest = useCallback(async () => {
    try {
      const rows = (ok(await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(PAGE)) as Msg[]).reverse()
      setMsgs(x => { const m = new Map(x.map(y => [y.id, y])); rows.forEach(r => m.set(r.id, r)); return [...m.values()].sort(sortMsgs) })
      if (!ready) setMore(rows.length === PAGE)
      setReady(true); setErr('')
    } catch (e) { setErr(errMsg(e)) }
  }, [ready])

  useEffect(() => {
    void loadLatest()
    const ch = supabase.channel('class-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => add(p.new as Msg))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, p => setMsgs(x => x.filter(m => m.id !== (p.old as { id: string }).id)))
      .subscribe(s => { if (s === 'SUBSCRIBED') void loadLatest() }) // после обрыва связи подтягиваем пропущенное
    return () => { void supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => { const el = box.current; if (el && stick.current) el.scrollTop = el.scrollHeight }, [msgs])

  async function loadMore() {
    const el = box.current; if (!el || !msgs.length) return
    const prev = el.scrollHeight
    try {
      const rows = (ok(await supabase.from('messages').select('*').lt('created_at', msgs[0].created_at).order('created_at', { ascending: false }).limit(PAGE)) as Msg[]).reverse()
      stick.current = false; setMore(rows.length === PAGE); setMsgs(x => [...rows, ...x].sort(sortMsgs))
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prev })
    } catch (e) { setErr(errMsg(e)) }
  }
  async function send() {
    const body = text.trim(); if (!body || sending) return
    setSending(true); setErr('')
    const r = await supabase.from('messages').insert({ body }).select().single()
    setSending(false)
    if (r.error) { setErr('Не отправлено: ' + r.error.message); return } // текст остаётся в поле, можно повторить
    stick.current = true; add(r.data as Msg); setText('')
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-8rem)]">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Общий чат</h1>
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={box} onScroll={e => { const t = e.currentTarget; stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 80 }} className="flex-1 space-y-0.5 overflow-y-auto p-4">
          {more && <div className="pb-2 text-center"><button onClick={() => void loadMore()} className="text-sm text-muted hover:text-fg">Показать ранние сообщения</button></div>}
          {!ready ? <div className="h-16 animate-pulse rounded-ctl bg-surface2" /> : !msgs.length && <p className="py-10 text-center text-sm text-muted">Сообщений пока нет. Напишите первым.</p>}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1]; const mine = m.author_id === me.id
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)
            const grouped = !newDay && prev.author_id === m.author_id && +new Date(m.created_at) - +new Date(prev.created_at) < 300000
            return (
              <div key={m.id}>
                {newDay && <p className="py-3 text-center text-xs text-muted">{dayLabel(m.created_at)}</p>}
                <motion.div initial={ready ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={spring} className={`group flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'pt-2'}`}>
                  <div className={`max-w-[82%] rounded-card px-3 py-2 text-sm ${mine ? 'bg-accent text-white' : 'bg-surface2'}`}>
                    {!grouped && !mine && <p className="mb-0.5 text-xs font-medium text-accent">{names[m.author_id] ?? 'Участник'}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-0.5 text-right text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>{time(m.created_at)}</p>
                  </div>
                  {(mine || me.role === 'owner') && (
                    <button onClick={() => void supabase.from('messages').delete().eq('id', m.id)} aria-label="Удалить сообщение"
                      className={`self-center rounded-ctl p-1.5 text-muted opacity-0 transition hover:text-danger focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60 ${mine ? 'order-first' : ''}`}><Trash2 size={14} /></button>)}
                </motion.div>
              </div>)
          })}
        </div>
        <div className="border-t border-line p-3">
          <p aria-live="polite" className="min-h-4 pb-1 text-xs text-danger">{err}</p>
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1} maxLength={2000} placeholder="Сообщение"
              className="field max-h-32 min-h-10 resize-none py-2" style={{ height: 'auto', fieldSizing: 'content' } as CSSProperties} />
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} transition={spring} onClick={() => void send()} disabled={!text.trim() || sending} aria-label="Отправить"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-accent text-white transition-opacity disabled:opacity-40"><Send size={18} /></motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
