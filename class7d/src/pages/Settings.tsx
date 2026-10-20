import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { ROLE_LABEL } from '../lib/types'

export function Settings() {
  const { profile, refresh } = useAuth(); const me = profile!
  const [name, setName] = useState(me.full_name); const [pw, setPw] = useState('')
  const [n1, setN1] = useState<'idle' | 'loading' | 'success'>('idle'); const [n2, setN2] = useState<'idle' | 'loading' | 'success'>('idle')
  const [msg, setMsg] = useState('')
  async function saveName(e: FormEvent) {
    e.preventDefault(); setN1('loading'); setMsg('')
    const r = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', me.id)
    if (r.error) { setMsg(r.error.message); setN1('idle'); return }
    await refresh(); setN1('success'); setTimeout(() => setN1('idle'), 1000)
  }
  async function savePw(e: FormEvent) {
    e.preventDefault(); setN2('loading'); setMsg('')
    const r = await supabase.auth.updateUser({ password: pw })
    if (r.error) { setMsg(r.error.message); setN2('idle'); return }
    setPw(''); setN2('success'); setTimeout(() => setN2('idle'), 1000)
  }
  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
      <p className="text-sm text-muted">Логин: {me.login} · {ROLE_LABEL[me.role]}</p>
      <form onSubmit={saveName} className="card space-y-3 p-4"><p className="text-sm font-medium">Имя</p>
        <input className="field" value={name} onChange={e => setName(e.target.value)} required maxLength={60} /><Button type="submit" status={n1}>Сохранить</Button></form>
      <form onSubmit={savePw} className="card space-y-3 p-4"><p className="text-sm font-medium">Новый пароль</p>
        <input className="field" type="password" minLength={8} placeholder="От 8 символов" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="new-password" /><Button type="submit" status={n2}>Сменить пароль</Button></form>
      <p aria-live="polite" className="min-h-5 text-sm text-danger">{msg}</p>
    </div>
  )
}
