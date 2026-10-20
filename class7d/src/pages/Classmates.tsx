import { motion } from 'framer-motion'
import { useProfiles } from '../lib/live'
import { ROLE_LABEL } from '../lib/types'
import { ease } from '../lib/motion'

export function Classmates() {
  const { data, error } = useProfiles()
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Ученики</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">{(data ?? []).map((u, i) => (
        <motion.li key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease, delay: Math.min(i, 10) * 0.03 }} className="card lift flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-medium text-accent">{(u.full_name || u.login)[0]?.toUpperCase()}</span>
          <div><p className="text-sm font-medium">{u.full_name || u.login}</p><p className="text-xs text-muted">{ROLE_LABEL[u.role]}</p></div>
        </motion.li>))}</ul>
    </div>
  )
}
