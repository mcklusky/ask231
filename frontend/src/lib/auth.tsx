import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, SESSION_EXPIRED_EVENT, type Profile, type Tokens } from './api'
import { clearSavedData } from './pwa'

type AuthContextValue = { profile: Profile | null; ready: boolean; setProfile: (profile: Profile | null) => void; login: (identifier: string, password: string) => Promise<void>; signInWithTokens: (tokens: Tokens) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    async function hydrate() {
      if (!localStorage.getItem('marketday.access') && !localStorage.getItem('marketday.refresh')) { setReady(true); return }
      // An expired access token is renewed automatically by the API client (see lib/api.ts).
      const saved = localStorage.getItem('marketday.refresh')
      try { const { data } = await api.get<Profile>('/auth/profile/'); setProfile(data) }
      catch {
        // Only clear the old sign-in: an email link may have signed them in meanwhile.
        if (localStorage.getItem('marketday.refresh') === saved) { localStorage.removeItem('marketday.access'); localStorage.removeItem('marketday.refresh') }
      }
      finally { setReady(true) }
    }
    void hydrate()
    // If a session can't be renewed (signed out elsewhere, or 7 days passed), show the signed-out state.
    const onExpired = () => setProfile(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])
  const value = useMemo<AuthContextValue>(() => {
    async function signInWithTokens(tokens: Tokens) {
      localStorage.setItem('marketday.access', tokens.access)
      localStorage.setItem('marketday.refresh', tokens.refresh)
      const result = await api.get<Profile>('/auth/profile/')
      setProfile(result.data)
    }
    return {
    profile, ready, setProfile, signInWithTokens,
    async login(identifier, password) {
      // The sign-in field is called "email" by the API but accepts an email address or a phone number.
      const { data } = await api.post<Tokens>('/auth/token/', { email: identifier.trim(), password })
      await signInWithTokens(data)
    },
    async logout() {
      const refresh = localStorage.getItem('marketday.refresh')
      try { if (refresh) await api.post('/auth/logout/', { refresh }) } finally {
        localStorage.removeItem('marketday.access'); localStorage.removeItem('marketday.refresh'); setProfile(null)
        void clearSavedData()
      }
    },
    }
  }, [profile, ready])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
