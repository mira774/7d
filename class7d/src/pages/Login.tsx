import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Backdrop } from '../components/Backdrop'
import { Button } from '../components/Button'
import { useAuth } from '../lib/auth'
import { isConfigured } from '../lib/supabase'
import { ease } from '../lib/motion'

export function Login() {
  const { session, signIn } = useAuth()
  const [id, setId] = useState(''); const [pw, setPw] = useState('')
  const [error, setError] = useState(''); const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  if (session) return <Navigate to="/dashboard" replace />
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setStatus('loading')
    const err = await signIn(id, pw); if (err) { setError(err); setStatus('idle') }
  }
  return (
    <div className="relative flex min-h-full items-center justify-center p-4">
      <Backdrop />
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }} className="card relative w-full max-w-sm space-y-4 p-6">
        <div><h1 className="text-lg font-semibold tracking-tight">CLASS 7D</h1><p className="mt-1 text-sm text-muted">Войдите с логином и кодом, которые выдал владелец сайта.</p></div>
        {!isConfigured && <p className="rounded-ctl border border-danger/40 p-3 text-sm text-danger">Сайт не подключён к Supabase: проверьте переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.</p>}
        <input className="field" placeholder="Логин или почта" value={id} onChange={e => setId(e.target.value)} required autoComplete="username" autoCapitalize="none" />
        <input className="field" type="password" placeholder="Код доступа" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="current-password" />
        <div aria-live="polite" className="min-h-5 text-sm text-danger">{error}</div>
        <Button type="submit" status={status} disabled={!isConfigured} className="w-full">Войти</Button>
      </motion.form>
    </div>
  )
}
