import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { errMsg, ok } from './api'
import type { Profile } from './types'

// Загружает данные и сам обновляет их, когда в указанных таблицах что-то меняется (realtime).
export function useLive<T>(fetcher: () => Promise<T>, tables: string[], deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => { try { setData(await fetcher()); setError('') } catch (e) { setError(errMsg(e)) } }, deps)
  useEffect(() => {
    void reload()
    let t: number | undefined
    const ch = supabase.channel('live-' + tables.join('-') + Math.random().toString(36).slice(2))
    for (const table of tables) ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => { clearTimeout(t); t = window.setTimeout(() => void reload(), 150) })
    ch.subscribe()
    return () => { clearTimeout(t); void supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload])
  return { data, error, reload }
}

export function useProfiles() {
  const r = useLive(async () => ok(await supabase.from('profiles').select('*').order('created_at')) as Profile[], ['profiles'])
  const names: Record<string, string> = {}
  for (const p of r.data ?? []) names[p.id] = p.full_name || p.login
  return { ...r, names }
}
