import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileWarning } from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import { LEGAL } from '@/lib/legal'
import { SITE_NAME } from '@/config/site'

export type LegalSection = { id: string; title: string; body: ReactNode }

/** Shared layout for the Terms of Use and Privacy Policy: numbered sections with a contents list. */
export default function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-red">{SITE_NAME}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {LEGAL.effectiveDate}</p>

        {LEGAL.DRAFT && (
          <div role="note" className="mt-5 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <FileWarning className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p><b>Draft.</b> This document has not yet been reviewed by a lawyer and may change before {SITE_NAME} launches. It is not legal advice.</p>
          </div>
        )}

        <div className="mt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Contents" className="mb-8 lg:mb-0">
            <div className="rounded-lg border bg-card p-4 lg:sticky lg:top-24">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contents</p>
              <ol className="grid gap-1 text-sm">
                {sections.map((section, index) => (
                  <li key={section.id}><a href={`#${section.id}`} className="block rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">{index + 1}. {section.title}</a></li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="max-w-prose text-[15px] leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-brand-blue [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            <div className="text-base text-foreground [&_p]:mt-0">{intro}</div>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="mt-10 scroll-mt-24 border-t pt-6">
                <h2 className="font-display text-xl font-bold text-foreground">{index + 1}. {section.title}</h2>
                {section.body}
              </section>
            ))}
            <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
              Questions? Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. See also our{' '}
              <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </article>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {LEGAL.operator} · <Link to="/terms" className="hover:text-foreground">Terms</Link> · <Link to="/privacy" className="hover:text-foreground">Privacy</Link></footer>
    </div>
  )
}
