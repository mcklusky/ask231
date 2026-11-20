import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Download, Heart, Search, LayoutDashboard, List, LogOut, MessageCircle, Moon, Plus, Smartphone, Sun, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { accountLabel } from '@/lib/api'
import { chatApi } from '@/lib/chat'
import { useInstallAction } from '@/components/InstallApp'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { BrandLockup, LogoMark } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SITE_NAME } from '@/config/site'

function initials(first: string, last: string, email: string) {
  const fromName = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.trim()
  return (fromName || email[0] || '?').toUpperCase()
}

/** Unread messages for the signed-in member. Refreshes on navigation, when the tab regains focus, and every minute. */
function useUnreadMessages(signedIn: boolean) {
  const [count, setCount] = useState(0)
  const { pathname } = useLocation()
  useEffect(() => {
    if (!signedIn) { setCount(0); return }
    let alive = true
    const load = () => { if (document.visibilityState === 'visible') chatApi.unreadCount().then(({ data }) => { if (alive) setCount(data.count) }).catch(() => undefined) }
    load()
    // The inbox polls on its own, so the header only polls elsewhere.
    const timer = pathname.startsWith('/messages') ? undefined : window.setInterval(load, 60000)
    document.addEventListener('visibilitychange', load)
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [signedIn, pathname])
  return count
}

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return <span aria-hidden="true" className={cn('grid h-5 min-w-5 place-items-center rounded-full bg-brand-accent px-1 text-[11px] font-bold leading-none text-white ring-2 ring-primary dark:ring-card', className)}>{count > 99 ? '99+' : count}</span>
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white', isActive && 'bg-white/15 text-white')

/** The one header for every public marketplace page: Liberian blue band, red call to action, account menu. */
export default function PublicHeader() {
  const { profile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const sellTo = profile ? '/ads/new' : '/register'
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const unread = useUnreadMessages(Boolean(profile))
  const installApp = useInstallAction()
  const messagesLabel = unread ? `Messages, ${unread} unread` : 'Messages'

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-brand-accent bg-primary text-white shadow-sm dark:bg-card">
      <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center gap-2 px-4 sm:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`${SITE_NAME} home`}>
          <LogoMark onBrand />
          <BrandLockup onBlue hideCountryOnTiny />
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
          <NavLink to="/listings" className={navLinkClass}>Buy smarter</NavLink>
          <NavLink to={sellTo} className={navLinkClass}>Sell faster</NavLink>
          <NavLink to="/requests" className={navLinkClass}>Wanted</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="on-brand" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <ThemeIcon />
          </Button>

          {profile ? (
            <>
              <Button asChild variant="on-brand" size="icon" className="relative hidden sm:inline-flex" aria-label={messagesLabel} title={messagesLabel}>
                <Link to="/messages"><MessageCircle /><UnreadBadge count={unread} className="absolute -right-1 -top-1" /></Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary" aria-label={unread ? `Open account menu, ${unread} unread messages` : 'Open account menu'}>
                    <Avatar className="size-10 ring-2 ring-white/70">
                      <AvatarFallback className="bg-white text-primary">{initials(profile.first_name, profile.last_name, accountLabel(profile))}</AvatarFallback>
                    </Avatar>
                    <UnreadBadge count={unread} className="absolute -right-1 -top-1 sm:hidden" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <span className="block truncate font-semibold">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'My account'}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{accountLabel(profile)}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/account"><UserRound /> My profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/my-ads"><List /> My ads</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/favorites"><Heart /> Saved listings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/requests?tab=mine"><Search /> My requests</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/messages"><MessageCircle /> Messages{unread > 0 && <span className="ml-auto rounded-full bg-brand-accent px-1.5 text-[11px] font-bold text-white">{unread > 99 ? '99+' : unread}<span className="sr-only"> unread</span></span>}</Link></DropdownMenuItem>
                  {installApp.canInstall && <DropdownMenuItem onSelect={() => void installApp.start()}>{installApp.computer ? <Smartphone /> : <Download />} {installApp.label}</DropdownMenuItem>}
                  {profile.is_staff && <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard /> Staff dashboard</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={async () => { await logout(); navigate('/') }} className="text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive">
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="on-brand" className="px-3">
              <Link to="/login">Sign in</Link>
            </Button>
          )}

          <Button asChild variant="cta" className="ml-1 px-3 ring-1 ring-white/30 sm:px-4">
            <Link to={sellTo}><Plus /><span className="hidden sm:inline">Post an ad</span><span className="sm:hidden">Sell</span></Link>
          </Button>
        </div>
      </div>
      {installApp.dialog}
    </header>
  )
}
