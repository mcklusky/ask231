import { Facebook, Instagram, MessageCircle, Music2, Youtube, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/config/site'

/**
 * The site's own social pages. Set the addresses at build time (frontend/.env):
 * VITE_FACEBOOK_URL, VITE_INSTAGRAM_URL, VITE_TIKTOK_URL, VITE_YOUTUBE_URL, VITE_WHATSAPP_CHANNEL_URL.
 * Anything left empty is simply not shown.
 */
const env = import.meta.env
const SOCIAL: { label: string; href?: string; icon: LucideIcon }[] = [
  { label: 'Facebook', href: env.VITE_FACEBOOK_URL, icon: Facebook },
  { label: 'Instagram', href: env.VITE_INSTAGRAM_URL, icon: Instagram },
  { label: 'TikTok', href: env.VITE_TIKTOK_URL, icon: Music2 },
  { label: 'YouTube', href: env.VITE_YOUTUBE_URL, icon: Youtube },
  { label: 'WhatsApp channel', href: env.VITE_WHATSAPP_CHANNEL_URL, icon: MessageCircle },
]
const isSafe = (href?: string): href is string => Boolean(href && /^https:\/\//i.test(href))
export const socialLinks = SOCIAL.filter(item => isSafe(item.href)) as { label: string; href: string; icon: LucideIcon }[]
export const whatsappChannelUrl = isSafe(env.VITE_WHATSAPP_CHANNEL_URL) ? env.VITE_WHATSAPP_CHANNEL_URL : ''

/** Round icon links for footers. Renders nothing until at least one address is set. */
export function SocialLinks({ className }: { className?: string }) {
  if (!socialLinks.length) return null
  return (
    <nav aria-label={`${SITE_NAME} on social media`} className={cn('flex flex-wrap items-center gap-2', className)}>
      {socialLinks.map(({ label, href, icon: Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${SITE_NAME} on ${label}`} title={label}
          className="grid size-9 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-brand-blue">
          <Icon className="size-4" aria-hidden="true" />
        </a>
      ))}
    </nav>
  )
}

/** "Get new deals on WhatsApp" invitation. Renders nothing until VITE_WHATSAPP_CHANNEL_URL is set. */
export function WhatsAppChannelCard() {
  if (!whatsappChannelUrl) return null
  return (
    <section aria-label={`Follow ${SITE_NAME} on WhatsApp`} className="market-home-section">
      <div className="flex flex-col items-start gap-3 rounded-xl border border-whatsapp/40 bg-whatsapp/10 p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-whatsapp text-white"><MessageCircle className="size-5" aria-hidden="true" /></span>
        <div className="flex-1">
          <b className="font-display">Get the best new deals on WhatsApp</b>
          <p className="text-sm text-muted-foreground">Follow the {SITE_NAME} channel for hot listings, jobs and safety tips. Free, and you can leave any time.</p>
        </div>
        <Button asChild variant="whatsapp" className="shrink-0"><a href={whatsappChannelUrl} target="_blank" rel="noopener noreferrer"><MessageCircle />Join on WhatsApp</a></Button>
      </div>
    </section>
  )
}
