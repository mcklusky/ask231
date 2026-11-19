import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '@/components/PublicHeader'
import { SocialLinks } from '@/components/SocialLinks'
import { SITE_NAME } from '@/config/site'

/** Seller pages (post/edit ad, my ads, saved listings): the public header plus a page heading. */
export default function MarketLayout({ children, title, subtitle, eyebrow = 'Seller centre' }: { children: ReactNode; title: string; subtitle: string; eyebrow?: string }) {
  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-accent">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="market-content-legacy">{children}</div>
      </main>
      <footer className="grid justify-items-center gap-3 border-t py-6 text-center text-xs text-muted-foreground"><SocialLinks /><Link to="/" className="font-semibold text-foreground hover:text-primary">{SITE_NAME}</Link> · Made for local trade</footer>
    </div>
  )
}
