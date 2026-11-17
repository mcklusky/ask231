import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Heart, LayoutDashboard, List, LogOut, MessageCircle, Moon, Plus, Store, Sun, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function initials(first: string, last: string, email: string) {
  const fromName = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.trim()
  return (fromName || email[0] || '?').toUpperCase()
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

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-brand-red bg-primary text-white shadow-sm dark:bg-card">
      <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center gap-2 px-4 sm:gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="MarketDay Liberia home">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-red text-white shadow-sm ring-2 ring-white/90"><Store className="size-5" aria-hidden="true" /></span>
          <span className="font-display leading-none">
            <span className="block text-[19px] font-extrabold tracking-tight">marketday</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[0.2em] text-white/75 max-[359px]:hidden">LIBERIA</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
          <NavLink to="/listings" className={navLinkClass}>Buy smarter</NavLink>
          <NavLink to={sellTo} className={navLinkClass}>Sell faster</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="on-brand" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <ThemeIcon />
          </Button>

          {profile ? (
            <>
              <Button asChild variant="on-brand" size="icon" className="hidden sm:inline-flex" aria-label="Messages" title="Messages">
                <Link to="/messages"><MessageCircle /></Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary" aria-label="Open account menu">
                    <Avatar className="size-10 ring-2 ring-white/70">
                      <AvatarFallback className="bg-white text-primary">{initials(profile.first_name, profile.last_name, profile.email)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <span className="block truncate font-semibold">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'My account'}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{profile.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/account"><UserRound /> My account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/my-ads"><List /> My ads</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/favorites"><Heart /> Saved listings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/messages"><MessageCircle /> Messages</Link></DropdownMenuItem>
                  {profile.is_staff && <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard /> Staff dashboard</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={async () => { await logout(); navigate('/') }} className="text-brand-red focus:bg-brand-red/10 focus:text-brand-red [&_svg]:text-brand-red">
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
    </header>
  )
}
