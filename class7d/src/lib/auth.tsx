import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'
import type { Profile } from './types'

interface AuthState {
  session: Session | null; profile: Profile | null; loading: boolean
  signIn: (identifier: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>; refresh: () => Promise<void>
}
const Ctx = createContext<AuthState>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    void supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setTimeout(() => void load(s), 0) })
    return () => sub.subscription.unsubscribe()
  }, [load])

  // Права могут измениться, пока человек на сайте: обновляем профиль в реальном времени.
  useEffect(() => {
    const id = session?.user.id; if (!id) return
    const ch = supabase.channel('me-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, () => void load(session)).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [session, load])

  async function signIn(identifier: string, password: string) {
    const id = identifier.trim()
    const email = id.includes('@') ? id : `${id.toLowerCase()}@class7d.app`
    const { error } = await supabase.auth.signInWithPassword({ email, password: password.trim() })
    if (!error) return null
    return error.message.includes('Invalid login') ? 'Неверный логин или пароль' : error.message
  }
  return <Ctx.Provider value={{ session, profile, loading, signIn, signOut: async () => { await supabase.auth.signOut() }, refresh: () => load(session) }}>{children}</Ctx.Provider>
}
