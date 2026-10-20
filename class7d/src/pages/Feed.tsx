import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Paperclip, Pencil, Pin, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { FileView } from '../components/FileView'
import { Modal } from '../components/Modal'
import { useAuth } from '../lib/auth'
import { MAX_FILE, can, errMsg, ok, removeFiles, savePost, uploadFile } from '../lib/api'
import { useLive, useProfiles } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { FileRef, Post, PostKind } from '../lib/types'
import { fmtDate, fmtSize, todayStr } from '../lib/util'
import { ease, spring } from '../lib/motion'

const CFG = {
  homework: { title: 'Домашние задания', add: 'Новое задание', empty: 'Заданий пока нет', hint: 'Задания публикует владелец или модератор.' },
  answer: { title: 'Ответы и материалы', add: 'Добавить материал', empty: 'Материалов пока нет', hint: 'Сюда добавляют ответы, конспекты и фото доски.' },
  news: { title: 'Объявления', add: 'Новое объявление', empty: 'Объявлений пока нет', hint: 'Важные новости класса появятся здесь.' },
} as const

function PostForm({ kind, post, subjects, onClose }: { kind: PostKind; post: Post | null; subjects: string[]; onClose: () => void }) {
  const [title, setTitle] = useState(post?.title ?? ''); const [body, setBody] = useState(post?.body ?? '')
  const [subject, setSubject] = useState(post?.subject ?? ''); const [due, setDue] = useState(post?.due_date ?? '')
  const [pinned, setPinned] = useState(post?.pinned ?? false)
  const [keep, setKeep] = useState<FileRef[]>(post?.files ?? []); const [fresh, setFresh] = useState<File[]>([])
  const [error, setError] = useState(''); const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  function pick(list: FileList | null) {
    if (!list) return
    const arr = [...list]; const big = arr.find(f => f.size > MAX_FILE)
    if (big) { setError(`Файл «${big.name}» больше 25 МБ`); return }
    setError(''); setFresh(f => [...f, ...arr])
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setStatus('loading'); setError('')
    let uploaded: FileRef[] = []
    try {
      uploaded = await Promise.all(fresh.map(uploadFile))
      await savePost({ id: post?.id, kind, title: title.trim(), body: body.trim(), subject: subject.trim(), due_date: due || null, pinned, files: [...keep, ...uploaded] })
      await removeFiles((post?.files ?? []).filter(f => !keep.some(k => k.path === f.path)).map(f => f.path))
      setStatus('success'); setTimeout(onClose, 450)
    } catch (err) { await removeFiles(uploaded.map(f => f.path)); setError(errMsg(err)); setStatus('idle') }
  }
  const rows = [...keep.map(f => ({ key: f.path, name: f.name, size: f.size, rm: () => setKeep(k => k.filter(x => x.path !== f.path)) })),
    ...fresh.map((f, i) => ({ key: 'n' + i + f.name, name: f.name, size: f.size, rm: () => setFresh(x => x.filter((_, j) => j !== i)) }))]
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="field" placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} />
      {kind !== 'news' && (<>
        <input className="field" placeholder="Предмет (например, Алгебра)" list="subjects" value={subject} onChange={e => setSubject(e.target.value)} required />
        <datalist id="subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist>
      </>)}
      {kind === 'homework' && <label className="flex items-center gap-3 text-sm text-muted">Срок сдачи<input type="date" className="field w-auto" value={due} onChange={e => setDue(e.target.value)} /></label>}
      <textarea className="field min-h-28 py-2" placeholder="Текст, решение или ссылки" value={body} onChange={e => setBody(e.target.value)} />
      {kind === 'news' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)]} className="accent-[rgb(var(--accent))]" />Закрепить вверху</label>}
      <div className="space-y-2">
        {rows.map(f => (
          <div key={f.key} className="flex items-center justify-between rounded-ctl border border-line px-3 py-1.5 text-sm"><span className="truncate">{f.name} <span className="text-muted">{fmtSize(f.size)}</span></span>
            <button type="button" onClick={f.rm} aria-label="Убрать файл" className="text-muted hover:text-danger"><X size={16} /></button></div>))}
        <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-ctl border border-dashed border-line text-sm text-muted transition-colors hover:border-accent hover:text-fg">
          <Paperclip size={16} />Прикрепить фото или файл<input type="file" multiple hidden onChange={e => { pick(e.target.files); e.target.value = '' }} />
        </label>
      </div>
      <div aria-live="polite" className="min-h-5 text-sm text-danger">{error}</div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Отмена</Button><Button type="submit" status={status}>Сохранить</Button></div>
    </form>
  )
}

export function Feed({ kind }: { kind: PostKind }) {
  const { profile } = useAuth(); const me = profile!; const cfg = CFG[kind]
  const canEdit = can(me, kind)
  const posts = useLive(async () => ok(await supabase.from('posts').select('*').eq('kind', kind).order('created_at', { ascending: false })) as Post[], ['posts'], [kind])
  const doneQ = useLive(async () => (ok(await supabase.from('homework_done').select('post_id').eq('user_id', me.id)) as { post_id: string }[]).map(r => r.post_id), ['homework_done'], [me.id])
  const { names } = useProfiles()
  const [q, setQ] = useState(''); const [subject, setSubject] = useState('Все'); const [flt, setFlt] = useState<'all' | 'todo' | 'done'>('all')
  const [editing, setEditing] = useState<Post | 'new' | null>(null)
  const [opt, setOpt] = useState<Record<string, boolean>>({}); const [note, setNote] = useState('')
  const all = useMemo(() => posts.data ?? [], [posts.data])
  const subjects = useMemo(() => [...new Set(all.map(p => p.subject).filter(Boolean))], [all])
  const doneSet = new Set(doneQ.data ?? []); const today = todayStr()
  const isDone = (id: string) => (id in opt ? opt[id] : doneSet.has(id))

  async function toggle(id: string) {
    const next = !isDone(id); setOpt(o => ({ ...o, [id]: next })); setNote('')
    const r = next ? await supabase.from('homework_done').insert({ post_id: id }) : await supabase.from('homework_done').delete().eq('post_id', id).eq('user_id', me.id)
    if (r.error && r.error.code !== '23505') setNote(r.error.message)
    await doneQ.reload(); setOpt(o => { const c = { ...o }; delete c[id]; return c })
  }
  async function remove(p: Post) {
    if (!confirm('Удалить запись?')) return
    const r = await supabase.from('posts').delete().eq('id', p.id)
    if (r.error) { setNote(r.error.message); return }
    await removeFiles(p.files.map(f => f.path)); void posts.reload()
  }

  const list = all.filter(p => (subject === 'Все' || p.subject === subject) && (kind !== 'homework' || flt === 'all' || (flt === 'done') === isDone(p.id))
    && (p.title + ' ' + p.body).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => kind === 'homework' ? (a.due_date || '9').localeCompare(b.due_date || '9') : kind === 'news' ? Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at))

  const Chip = ({ id, label, active, on }: { id: string; label: string; active: boolean; on: () => void }) => (
    <button onClick={on} className={`relative rounded-full px-3 py-1 text-sm transition-colors ${active ? 'text-white' : 'text-muted hover:text-fg'}`}>
      {active && <motion.span layoutId={id} transition={spring} className="absolute inset-0 rounded-full bg-accent" />}<span className="relative">{label}</span></button>)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{cfg.title}</h1>
        {canEdit && <Button onClick={() => setEditing('new')}><Plus size={16} />{cfg.add}</Button>}
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted" /><input className="field pl-9" placeholder="Поиск" value={q} onChange={e => setQ(e.target.value)} /></div>
      {(kind !== 'news' && subjects.length > 0 || kind === 'homework') && (
        <div className="flex flex-wrap gap-1">
          {kind !== 'news' && ['Все', ...subjects].map(x => <Chip key={x} id={'sub' + kind} label={x} active={subject === x} on={() => setSubject(x)} />)}
          {kind === 'homework' && <span className="mx-2 w-px bg-line" />}
          {kind === 'homework' && ([['all', 'Все'], ['todo', 'Не выполнено'], ['done', 'Выполнено']] as const).map(([k, l]) => <Chip key={k} id="flt" label={l} active={flt === k} on={() => setFlt(k)} />)}
        </div>)}
      <p aria-live="polite" className="text-sm text-danger">{posts.error || note}</p>
      {!posts.data ? <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-surface2" />)}</div>
        : !list.length ? <EmptyState icon={<Search />} title={all.length ? 'Ничего не найдено' : cfg.empty} hint={all.length ? 'Измените поиск или фильтр.' : canEdit ? 'Нажмите кнопку сверху, чтобы добавить первую запись.' : cfg.hint} /> : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((p, i) => {
              const done = isDone(p.id); const late = kind === 'homework' && !done && p.due_date && p.due_date < today
              return (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, ease, delay: Math.min(i, 6) * 0.04 }} className="card lift p-4">
                  <div className="flex items-start gap-3">
                    {kind === 'homework' && (
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => void toggle(p.id)} aria-label={done ? 'Отметить невыполненным' : 'Отметить выполненным'}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${done ? 'border-ok bg-ok text-white' : 'border-line hover:border-accent'}`}>
                        {done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Check size={14} /></motion.span>}</motion.button>)}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        {p.pinned && <Pin size={12} className="text-accent" />}{p.subject && <span>{p.subject}</span>}
                        {p.due_date && <span className={late ? 'text-danger' : ''}>до {fmtDate(p.due_date)}{late ? ', просрочено' : ''}</span>}
                        <span>{fmtDate(p.created_at)} · {(p.author_id && names[p.author_id]) || 'Автор удалён'}</span>
                      </div>
                      <h3 className={`mt-0.5 font-medium ${done ? 'text-muted line-through' : ''}`}>{p.title}</h3>
                      {p.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">{p.body}</p>}
                      {p.files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{p.files.map(f => <FileView key={f.path} f={f} />)}</div>}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => setEditing(p)} aria-label="Изменить" className="rounded-ctl p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-fg"><Pencil size={16} /></button>
                        <button onClick={() => void remove(p)} aria-label="Удалить" className="rounded-ctl p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
                      </div>)}
                  </div>
                </motion.li>)
            })}
          </AnimatePresence>
        </ul>)}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Изменить запись' : cfg.add}>
        {editing !== null && <PostForm key={editing === 'new' ? 'new' : editing.id} kind={kind} post={editing === 'new' ? null : editing} subjects={subjects} onClose={() => { setEditing(null); void posts.reload() }} />}
      </Modal>
    </div>
  )
}
