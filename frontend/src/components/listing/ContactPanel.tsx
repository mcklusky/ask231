import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { HandCoins, Heart, MapPin, MessageCircle, Phone, Send, Share2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyAmount } from '@/lib/marketplace'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const QUICK_MESSAGES = ['Is this still available?', 'What’s your last price?', 'Where can we meet?']

export type ContactPanelProps = {
  title: string
  priceLabel: string
  /** Numeric asking price, used for the offer shortcuts. */
  priceAmount?: number
  currency: string
  location: string
  conditionLabel: string
  saved: boolean
  busy?: boolean
  error?: string
  onToggleSave: () => void
  onMessageSeller: () => void
  /** Resolve true when the message was sent (the draft is then cleared). */
  onSendMessage: (body: string) => Promise<boolean>
  onSendOffer: (amount: number) => Promise<boolean>
  callHref?: string
  whatsappHref?: string
  /** Used instead of the links when there is no real seller (demo listings). */
  onCall?: () => void
  onWhatsApp?: () => void
  /** Rendered above the contact buttons (e.g. the verify-email notice). */
  notice?: ReactNode
  /** The "Report this listing" trigger. */
  report?: ReactNode
}

async function shareListing(title: string) {
  const url = window.location.href
  try {
    if (navigator.share) { await navigator.share({ title, text: `${title} on MarketDay`, url }); return }
    await navigator.clipboard.writeText(url)
    toast.success('Link copied', { description: 'Paste it into WhatsApp, SMS or anywhere you like.' })
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') toast.error('Could not share this listing', { description: 'Copy the address from your browser instead.' })
  }
}

/** Price, actions and messaging for a listing: one component for real and demo ads so they never drift apart. */
export default function ContactPanel(props: ContactPanelProps) {
  const { title, priceLabel, priceAmount, currency, location, conditionLabel, saved, busy, error } = props
  const [draft, setDraft] = useState('')
  const [offerOpen, setOfferOpen] = useState(false)
  const [offer, setOffer] = useState('')
  const offerValue = Number(offer)
  const offerValid = Number.isFinite(offerValue) && offerValue > 0
  const suggestions = priceAmount && priceAmount > 0
    ? [5, 10, 15].map(pct => ({ pct, amount: Math.max(1, Math.round((priceAmount * (100 - pct)) / 100)) }))
    : []

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (body && await props.onSendMessage(body)) setDraft('')
  }
  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (offerValid && await props.onSendOffer(offerValue)) { setOfferOpen(false); setOffer('') }
  }

  return (
    <Card className="overflow-hidden">
      <div className="space-y-2 border-b bg-gradient-to-b from-secondary/70 to-card p-5">
        <Badge variant="secondary" className="uppercase tracking-wide">{conditionLabel}</Badge>
        <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-primary dark:text-brand-blue">{priceLabel}</p>
        <h1 className="text-base font-semibold leading-snug text-foreground">{title}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" aria-hidden="true" />{location}</p>
      </div>

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={props.onToggleSave} aria-pressed={saved} className={cn(saved && 'border-brand-red/50 text-brand-red hover:text-brand-red')}>
            <Heart className={cn(saved && 'fill-current')} />{saved ? 'Saved' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => void shareListing(title)}><Share2 />Share</Button>
        </div>

        {props.notice}

        <Button className="w-full" size="lg" onClick={props.onMessageSeller} disabled={busy}><MessageCircle />{busy ? 'Opening chat…' : 'Message seller'}</Button>
        <div className="grid grid-cols-2 gap-2">
          {props.callHref
            ? <Button asChild variant="cta"><a href={props.callHref}><Phone />Call</a></Button>
            : <Button variant="cta" onClick={props.onCall}><Phone />Call</Button>}
          {props.whatsappHref
            ? <Button asChild variant="whatsapp"><a href={props.whatsappHref} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
            : <Button variant="whatsapp" onClick={props.onWhatsApp}><MessageCircle />WhatsApp</Button>}
        </div>
        <Button variant="outline-red" className="w-full" onClick={() => setOfferOpen(true)}><HandCoins />Make an offer</Button>

        <form onSubmit={submitMessage} className="space-y-2.5 border-t pt-4">
          <Label htmlFor="quick-message">Send the seller a message</Label>
          <div className="flex flex-wrap gap-1.5" aria-label="Quick messages">
            {QUICK_MESSAGES.map(text => (
              <button key={text} type="button" onClick={() => setDraft(text)}
                className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', draft === text ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground')}>
                {text}
              </button>
            ))}
          </div>
          <Textarea id="quick-message" rows={3} maxLength={4000} placeholder="Ask a question about this item…" value={draft} onChange={event => setDraft(event.target.value)} />
          <Button type="submit" variant="secondary" className="w-full" disabled={!draft.trim() || busy}><Send />{busy ? 'Sending…' : 'Send message'}</Button>
        </form>

        {error && <p role="alert" className="rounded-md border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{error}</p>}

        <div className="flex items-start justify-between gap-3 border-t pt-3">
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />Meet in a safe public place and check the item before you pay.</p>
        </div>
        {props.report}
      </div>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make an offer</DialogTitle>
            <DialogDescription>Your offer goes to the seller in a private chat. Asking price: <b className="text-foreground">{priceLabel}</b></DialogDescription>
          </DialogHeader>
          <form onSubmit={submitOffer} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="offer-amount">Your offer</Label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-bold text-muted-foreground">{currency}</span>
                <Input id="offer-amount" type="number" min="1" step="any" inputMode="decimal" autoFocus placeholder="Enter amount" value={offer} onChange={event => setOffer(event.target.value)} className="rounded-l-none text-lg font-semibold" />
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">Quick offers</span>
                <div className="grid grid-cols-3 gap-2">
                  {suggestions.map(({ pct, amount }) => (
                    <button key={pct} type="button" onClick={() => setOffer(String(amount))}
                      className={cn('rounded-md border px-2 py-2 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', Number(offer) === amount ? 'border-primary bg-secondary' : 'border-border')}>
                      <span className="block text-sm font-bold text-foreground">{formatCurrencyAmount(amount, currency)}</span>
                      <span className="block text-[11px] text-muted-foreground">{pct}% less</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOfferOpen(false)}>Cancel</Button>
              <Button type="submit" variant="cta" disabled={!offerValid || busy}><Send />{busy ? 'Sending…' : 'Send offer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
