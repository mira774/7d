import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download } from 'lucide-react'
import { fileUrl } from '../lib/api'
import { fmtSize } from '../lib/util'
import type { FileRef } from '../lib/types'

function ImageThumb({ f }: { f: FileRef }) {
  const [url, setUrl] = useState(''); const [bad, setBad] = useState(false)
  useEffect(() => { fileUrl(f).then(setUrl).catch(() => setBad(true)) }, [f])
  if (bad) return <div className="flex h-24 w-32 items-center justify-center rounded-ctl border border-line text-xs text-muted">Не загрузилось</div>
  if (!url) return <div className="h-24 w-32 animate-pulse rounded-ctl bg-surface2" />
  return (
    <motion.a whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} href={url} target="_blank" rel="noreferrer" title={f.name}>
      <img src={url} alt={f.name} className="h-24 w-32 rounded-ctl border border-line object-cover" />
    </motion.a>
  )
}

export function FileView({ f }: { f: FileRef }) {
  if (f.type.startsWith('image/')) return <ImageThumb f={f} />
  async function open() {
    try { const u = await fileUrl(f, f.type !== 'application/pdf'); window.open(u, '_blank', 'noopener') } catch { alert('Не удалось открыть файл') }
  }
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => void open()}
      className="flex items-center gap-2 rounded-ctl border border-line px-3 py-2 text-left text-sm transition-colors hover:border-accent/50 hover:bg-surface2">
      <FileText size={16} className="shrink-0 text-muted" /><span className="max-w-[180px] truncate">{f.name}</span>
      <span className="text-xs text-muted">{fmtSize(f.size)}</span><Download size={14} className="text-muted" />
    </motion.button>
  )
}
