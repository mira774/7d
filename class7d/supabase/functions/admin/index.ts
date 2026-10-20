// Edge Function «admin»: создание учеников/модераторов, сброс кода, удаление.
// Секретный service_role-ключ живёт только здесь, на сервере Supabase. Вызывать может только владелец.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const PERMS = ['homework', 'answer', 'news', 'schedule']
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), n => 'abcdefghjkmnpqrstuvwxyz23456789'[n % 31]).join('')

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await asUser.auth.getUser()
  if (!user) return json({ error: 'Нет доступа' }, 401)
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'owner') return json({ error: 'Только владелец' }, 403)

  const body = await req.json().catch(() => ({}))
  if (body.action === 'create') {
    const login = String(body.login ?? '').toLowerCase().trim()
    const name = String(body.name ?? '').trim()
    const role = body.role === 'moderator' ? 'moderator' : 'student'
    const perms = role === 'moderator' ? (Array.isArray(body.perms) ? body.perms.filter((p: string) => PERMS.includes(p)) : []) : []
    if (!/^[a-z0-9._-]{3,30}$/.test(login)) return json({ error: 'Логин: 3–30 символов, латиница, цифры, . _ -' }, 400)
    if (name.length < 2) return json({ error: 'Введите имя' }, 400)
    const password = code()
    const { data, error } = await admin.auth.admin.createUser({ email: `${login}@class7d.app`, password, email_confirm: true, user_metadata: { login, full_name: name } })
    if (error) return json({ error: error.message.includes('already') ? 'Такой логин уже занят' : error.message }, 400)
    const { error: e2 } = await admin.from('profiles').update({ role, perms }).eq('id', data.user.id)
    if (e2) return json({ error: e2.message }, 500)
    return json({ login, code: password })
  }

  const { data: target } = await admin.from('profiles').select('id, role').eq('id', String(body.id ?? '')).maybeSingle()
  if (!target) return json({ error: 'Пользователь не найден' }, 404)
  if (target.role === 'owner') return json({ error: 'Владельца изменить нельзя' }, 403)
  if (body.action === 'reset') {
    const password = code()
    const { error } = await admin.auth.admin.updateUserById(target.id, { password })
    return error ? json({ error: error.message }, 500) : json({ code: password })
  }
  if (body.action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(target.id)
    return error ? json({ error: error.message }, 500) : json({ ok: true })
  }
  return json({ error: 'Неизвестное действие' }, 400)
})
