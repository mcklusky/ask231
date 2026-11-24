import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { chatApi } from '@/lib/chat'

const UnreadContext = createContext(0)

/**
 * Unread messages for the signed-in member, shared by the header and the phone tab bar so they make one request.
 * Refreshes on navigation, when the tab regains focus, and every minute (the inbox polls on its own).
 */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const signedIn = Boolean(profile)
  const [count, setCount] = useState(0)
  const { pathname } = useLocation()
  useEffect(() => {
    if (!signedIn) { setCount(0); return }
    let alive = true
    const load = () => { if (document.visibilityState === 'visible') chatApi.unreadCount().then(({ data }) => { if (alive) setCount(data.count) }).catch(() => undefined) }
    load()
    const timer = pathname.startsWith('/messages') ? undefined : window.setInterval(load, 60000)
    document.addEventListener('visibilitychange', load)
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [signedIn, pathname])
  return <UnreadContext.Provider value={count}>{children}</UnreadContext.Provider>
}

export function useUnreadMessages() { return useContext(UnreadContext) }
