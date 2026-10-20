export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const fmtDate = (s: string | number) => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ')
