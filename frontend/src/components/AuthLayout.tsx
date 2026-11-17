import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, MapPin, Moon, ShieldCheck, Store, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { COUNTRY_NAME, SITE_NAME } from '@/config/site'
import { BrandLockup } from '@/components/Brand'

function Logo({ onBlue = false }: { onBlue?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${SITE_NAME} home`}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-red text-white shadow-sm ring-2 ring-white/90"><Store className="size-5" aria-hidden="true" /></span>
      <BrandLockup onBlue={onBlue} />
    </Link>
  )
}

/** Five-pointed star (as on the Liberian flag). */
function LoneStar({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.95 6.98 7.55.62-5.74 4.94 1.75 7.38L12 17.77l-6.51 3.95 1.75-7.38L1.5 9.4l7.55-.62z" /></svg>
}

/** Sign-in, registration and account pages: Liberian-blue story panel beside a focused form. */
export default function AuthLayout({ children, title, subtitle, wide = false }: { children: ReactNode; title: string; subtitle: string; wide?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Story panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-brand-blue-deep">
        {/* red & white stripes, faded */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.13]" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(180deg, #c92f42 0 26px, #ffffff 26px 52px)', maskImage: 'linear-gradient(115deg, transparent 35%, #000 100%)', WebkitMaskImage: 'linear-gradient(115deg, transparent 35%, #000 100%)' }} />
        <div className="relative"><Logo onBlue /></div>
        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide ring-1 ring-white/20"><LoneStar className="size-3.5 text-white" />{COUNTRY_NAME.toUpperCase()}’S LOCAL MARKETPLACE</span>
          <h2 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight">Good things are closer than you think.</h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">Find what you need and meet the people behind it. A simpler way to buy and sell across all 15 counties.</p>
          <ul className="mt-8 grid gap-4">
            {[
              { icon: ShieldCheck, title: 'Buy with confidence', text: 'Real people, verified sellers and safety tips.' },
              { icon: BadgeCheck, title: 'Grow your business', text: 'Reach customers in every county.' },
              { icon: MapPin, title: 'Local first', text: 'Prices in L$ or US$, meet-ups near you.' },
            ].map(({ icon: Icon, title: heading, text }) => (
              <li key={heading} className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20"><Icon className="size-5" aria-hidden="true" /></span>
                <span><b className="block text-sm">{heading}</b><span className="text-sm text-white/70">{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <LoneStar className="pointer-events-none absolute -bottom-16 -right-16 size-80 text-white/[0.07]" />
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} {SITE_NAME} · Made for {COUNTRY_NAME}</p>
      </aside>

      {/* Form side */}
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b px-4 sm:px-8 lg:border-b-0">
          <div className="lg:invisible"><Logo /></div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><ThemeIcon /></Button>
            <Button asChild variant="ghost" className="px-3 text-muted-foreground"><Link to="/"><ArrowLeft /><span className="max-[400px]:sr-only">Back to marketplace</span></Link></Button>
          </div>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-8 sm:py-12">
          <div className={cn('w-full', wide ? 'max-w-xl' : 'max-w-md')}>
            <div className="mb-6">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Your information is protected and secure</p>
            <p className="mt-2 text-center text-xs text-muted-foreground">By continuing, you agree to our <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Use</Link> and <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
