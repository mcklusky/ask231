import { useEffect } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { Home, Megaphone, MessageCircle, Plus, UserRound, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUnreadMessages } from '@/lib/unread'
import { cn } from '@/lib/utils'

// Screens where people are busy with one task (typing, signing in, posting) get the whole screen.
const HIDDEN_ON = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/verify-phone', '/admin', '/ads/new', '/ads/:slug/edit', '/requests/new', '/messages/:conversationId']

type Tab = { label: string; to: string; icon: LucideIcon; active: boolean; badge?: number }

/**
 * Phones only: the main places of the site, always one thumb-tap away at the bottom of the screen.
 * Sets `has-tabbar` on <html> so layouts can leave room for it (see --tabbar-h in styles.css).
 */
export default function MobileTabBar() {
  const { profile } = useAuth()
  const unread = useUnreadMessages()
  const { pathname } = useLocation()
  const visible = !HIDDEN_ON.some(pattern => matchPath(pattern, pathname))

  useEffect(() => {
    document.documentElement.classList.toggle('has-tabbar', visible)
    return () => document.documentElement.classList.remove('has-tabbar')
  }, [visible])

  if (!visible) return null
  const signIn = (next: string) => `/login?next=${encodeURIComponent(next)}`
  const onBrowse = pathname === '/' || pathname.startsWith('/listings') || pathname.startsWith('/category/') || (pathname.startsWith('/ads/') && !pathname.endsWith('/edit'))
  const tabs: Tab[] = [
    { label: 'Home', to: '/', icon: Home, active: onBrowse },
    { label: 'Wanted', to: '/requests', icon: Megaphone, active: pathname.startsWith('/requests') },
    { label: 'Sell', to: profile ? '/ads/new' : '/register', icon: Plus, active: false },
    { label: 'Messages', to: profile ? '/messages' : signIn('/messages'), icon: MessageCircle, active: pathname.startsWith('/messages'), badge: unread },
    { label: 'Account', to: profile ? '/account' : '/login', icon: UserRound, active: ['/account', '/my-ads', '/favorites'].some(path => pathname.startsWith(path)) },
  ]

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-4px_16px_rgba(15,40,40,0.08)] backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5">
        {tabs.map(({ label, to, icon: Icon, active, badge }) => {
          const sell = label === 'Sell'
          return (
            <li key={label} className="flex">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                aria-label={badge ? `${label}, ${badge} unread` : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-muted',
                  active ? 'text-primary dark:text-brand-primary' : 'text-muted-foreground',
                )}
              >
                {sell ? (
                  <span className="-mt-5 grid size-12 place-items-center rounded-full bg-brand-accent text-white shadow-md ring-4 ring-card" aria-hidden="true"><Icon className="size-6" strokeWidth={2.5} /></span>
                ) : (
                  <span className="relative" aria-hidden="true">
                    <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} />
                    {badge ? <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white ring-2 ring-card">{badge > 99 ? '99+' : badge}</span> : null}
                  </span>
                )}
                <span className={cn(sell && 'text-brand-accent')}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
