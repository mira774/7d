import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Crown, KeyRound, Trash2 } from 'lucide-react'
import { Button } from '../components/Button'
import { Switch } from '../components/Switch'
import { callAdmin, errMsg } from '../lib/api'
import { useProfiles } from '../lib/live'
import { supabase } from '../lib/supabase'
import { toLogin } from '../lib/translit'
import { PERMS, ROLE_LABEL, type Perm } from '../lib/types'
import { ease } from '../lib/motion'

export function Admin() {
  const { data, error: loadErr, reload } = useProfiles()
  const [name, setName] = useState(''); const [login, setLogin] = useState(''); const [touched, setTouched] = useState(false)
  const [role, setRole] = useState<'moderator' | 'student'>('student')
  const [perms, setPerms] = useState<Perm[]>(['homework', 'answer', 'news'])
  const [issued, setIssued] = useState<{ who: string; login: string; code: string } | null>(null)
  const [error, setError] = useState(''); const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle'); const [copied, setCopied] = useState(false)

  async function add(e: FormEvent) {
    e.preventDefault(); setError(''); setStatus('loading')
    try {
      const r = await callAdmin({ action: 'create', name, login: login || toLogin(name), role, perms })
      setIssued({ who: name.trim(), login: r.login!, code: r.code! }); setName(''); setLogin(''); setTouched(false)
      setStatus('success'); setTimeout(() => setStatus('idle'), 900); void reload()
    } catch (err) { setError(errMsg(err)); setStatus('idle') }
  }
  async function act(fn: () => Promise<void>) { setError(''); try { await fn() } catch (err) { setError(errMsg(err)) } }
  const copy = () => { void navigator.clipboard?.writeText(`Логин: ${issued!.login}\nКод: ${issued!.code}`); setCopied(true); setTimeout(() => setCopied(false), 1200) }
  const toggle = (k: Perm) => setPerms(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]))
  async function patch(id: string, p: { role?: string; perms?: Perm[] }) {
    const r = await supabase.from('profiles').update(p).eq('id', id); if (r.error) throw new Error(r.error.message); void reload()
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Люди и права</h1>
        <p className="mt-1 text-sm text-muted">Регистрации нет: аккаунты создаёте вы и передаёте человеку логин и код. Владелец один, назначить второго нельзя.</p></div>

      <form onSubmit={add} className="card space-y-3 p-4">
        <h2 className="text-sm font-medium">Новый участник</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_11rem]">
          <input className="field" placeholder="Имя и фамилия" value={name} onChange={e => { setName(e.target.value); if (!touched) setLogin(toLogin(e.target.value)) }} required />
          <input className="field" placeholder="Логин (латиницей)" value={login} onChange={e => { setLogin(e.target.value.toLowerCase()); setTouched(true) }} required autoCapitalize="none" />
          <select className="field" value={role} onChange={e => setRole(e.target.value as 'moderator' | 'student')}><option value="student">Ученик</option><option value="moderator">Модератор</option></select>
        </div>
        {role === 'moderator' && <div className="grid gap-2 sm:grid-cols-2">{PERMS.map(p => (<div key={p.key} className="flex items-center justify-between rounded-ctl border border-line px-3 py-2 text-sm">{p.label}<Switch on={perms.includes(p.key)} onChange={() => toggle(p.key)} label={p.label} /></div>))}</div>}
        <div aria-live="polite" className="min-h-5 text-sm text-danger">{error || loadErr}</div>
        <Button type="submit" status={status}>Создать и выдать код</Button>
      </form>

      <AnimatePresence>
        {issued && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }} className="card border-accent/50 p-4">
            <p className="text-sm text-muted">Доступ для «{issued.who}». Код показывается один раз, потом его можно только сбросить.</p>
            <div className="mt-2 flex flex-wrap items-center gap-3"><code className="rounded-ctl bg-surface2 px-3 py-2">{issued.login} / <b className="tracking-widest">{issued.code}</b></code>
              <Button variant="ghost" onClick={copy}><Copy size={16} />{copied ? 'Скопировано' : 'Копировать'}</Button><Button variant="ghost" onClick={() => setIssued(null)}>Скрыть</Button></div>
          </motion.div>)}
      </AnimatePresence>

      <ul className="space-y-3">
        {(data ?? []).map((u, i) => (
          <motion.li key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease, delay: Math.min(i, 8) * 0.04 }} className="card lift p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><span className="font-medium">{u.full_name || u.login}</span><span className="text-sm text-muted">{u.login}</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${u.role === 'owner' ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted'}`}>{u.role === 'owner' && <Crown size={12} />}{ROLE_LABEL[u.role]}</span></div>
              {u.role !== 'owner' && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => void act(() => patch(u.id, { role: u.role === 'moderator' ? 'student' : 'moderator', perms: u.role === 'moderator' ? [] : ['homework', 'answer', 'news'] }))}>{u.role === 'moderator' ? 'Сделать учеником' : 'Сделать модератором'}</Button>
                  <Button variant="ghost" onClick={() => void act(async () => { const r = await callAdmin({ action: 'reset', id: u.id }); setIssued({ who: u.full_name || u.login, login: u.login, code: r.code! }) })}><KeyRound size={16} />Новый код</Button>
                  <Button variant="danger" onClick={() => { if (confirm(`Удалить ${u.full_name || u.login}?`)) void act(async () => { await callAdmin({ action: 'delete', id: u.id }); void reload() }) }}><Trash2 size={16} /></Button>
                </div>)}
            </div>
            {u.role === 'moderator' && <div className="mt-3 grid gap-2 sm:grid-cols-2">{PERMS.map(p => (
              <div key={p.key} className="flex items-center justify-between rounded-ctl border border-line px-3 py-2 text-sm">{p.label}
                <Switch on={u.perms.includes(p.key)} label={p.label} onChange={v => void act(() => patch(u.id, { perms: v ? [...u.perms, p.key] : u.perms.filter(x => x !== p.key) }))} /></div>))}</div>}
          </motion.li>))}
      </ul>
    </div>
  )
}
