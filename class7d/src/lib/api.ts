import { supabase } from './supabase'
import { uid } from './util'
import type { FileRef, Perm, PostKind, Profile } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ok<T = any>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Что-то пошло не так')
export const can = (p: Profile | null, perm: Perm) => !!p && (p.role === 'owner' || (p.role === 'moderator' && p.perms.includes(perm)))

export const MAX_FILE = 25 * 1024 * 1024
export async function uploadFile(file: File): Promise<FileRef> {
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const path = `${uid()}.${ext}` // оригинальное имя хранится в записи, ключ — только латиница
  const { error } = await supabase.storage.from('files').upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (error) throw new Error(error.message)
  return { path, name: file.name, type: file.type, size: file.size }
}
export async function removeFiles(paths: string[]) { if (paths.length) await supabase.storage.from('files').remove(paths) }

const cache = new Map<string, { url: string; exp: number }>()
export async function fileUrl(f: FileRef, download = false): Promise<string> {
  const key = f.path + download; const c = cache.get(key)
  if (c && c.exp > Date.now()) return c.url
  const { data, error } = await supabase.storage.from('files').createSignedUrl(f.path, 3600, download ? { download: f.name } : undefined)
  if (error || !data) throw new Error(error?.message ?? 'Файл недоступен')
  cache.set(key, { url: data.signedUrl, exp: Date.now() + 3500000 }); return data.signedUrl
}

export async function savePost(p: { id?: string; kind: PostKind; title: string; body: string; subject: string; due_date: string | null; pinned: boolean; files: FileRef[] }) {
  const { id, ...row } = p
  const r = id ? await supabase.from('posts').update(row).eq('id', id) : await supabase.from('posts').insert(row)
  if (r.error) throw new Error(r.error.message)
}

export async function callAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin', { body })
  if (error) {
    let m = error.message
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) m = j.error } catch { /* оставляем общее сообщение */ }
    throw new Error(m)
  }
  return data as { login?: string; code?: string; ok?: boolean }
}
