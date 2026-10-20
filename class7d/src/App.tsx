import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Button } from './components/Button'
import { AuthProvider, useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Feed } from './pages/Feed'
import { Schedule } from './pages/Schedule'
import { Admin } from './pages/Admin'
import { Chat } from './pages/Chat'
import { Classmates } from './pages/Classmates'
import { Settings } from './pages/Settings'

function Guard({ owner = false }: { owner?: boolean }) {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <div className="flex h-full items-center justify-center text-sm text-muted">Загрузка…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm text-muted">Профиль не найден. Выйдите и войдите снова или напишите владельцу сайта.</p><Button onClick={() => void signOut()}>Выйти</Button>
    </div>)
  if (owner && profile.role !== 'owner') return <Navigate to="/dashboard" replace />
  return <AppShell />
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/homework" element={<Feed kind="homework" />} />
            <Route path="/materials" element={<Feed kind="answer" />} />
            <Route path="/announcements" element={<Feed kind="news" />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/classmates" element={<Classmates />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
          </Route>
          <Route element={<Guard owner />}><Route path="/admin" element={<Admin />} /></Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
