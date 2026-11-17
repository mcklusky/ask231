import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type Profile, type Tokens } from './api'

type AuthContextValue = { profile: Profile | null; ready: boolean; setProfile: (profile: Profile | null) => void; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    async function hydrate() {
      const access = localStorage.getItem('marketday.access')
      const refresh = localStorage.getItem('marketday.refresh')
      if (!access) { setReady(true); return }
      try {
        const { data } = await api.get<Profile>('/auth/profile/')
        setProfile(data)
      } catch {
        if (!refresh) { localStorage.removeItem('marketday.access'); setReady(true); return }
        try {
          const { data } = await api.post<Tokens>('/auth/token/refresh/', { refresh })
          localStorage.setItem('marketday.access', data.access)
          if (data.refresh) localStorage.setItem('marketday.refresh', data.refresh)
          const result = await api.get<Profile>('/auth/profile/')
          setProfile(result.data)
        } catch {
          localStorage.removeItem('marketday.access'); localStorage.removeItem('marketday.refresh')
        }
      } finally { setReady(true) }
    }
    void hydrate()
  }, [])
  const value = useMemo<AuthContextValue>(() => ({
    profile, ready, setProfile,
    async login(email, password) {
      const { data } = await api.post<Tokens>('/auth/token/', { email, password })
      localStorage.setItem('marketday.access', data.access)
      localStorage.setItem('marketday.refresh', data.refresh)
      const result = await api.get<Profile>('/auth/profile/')
      setProfile(result.data)
    },
    async logout() {
      const refresh = localStorage.getItem('marketday.refresh')
      try { if (refresh) await api.post('/auth/logout/', { refresh }) } finally {
        localStorage.removeItem('marketday.access'); localStorage.removeItem('marketday.refresh'); setProfile(null)
      }
    },
  }), [profile, ready])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
