import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { messageFromError } from '@/utils/errors'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/input'
import { SITE_NAME } from '@/config/site'

export type SellerReview = { id: number; rating: number; comment: string; reviewer_name: string; listing_title: string; created_at: string }
export type SellerRating = { average: number | null; count: number; reviews: SellerReview[] }

export const reviewsApi = {
  forListing: (slug: string) => api.get<SellerRating>(`/market/advertisements/${encodeURIComponent(slug)}/reviews/`),
  mine: (conversationId: number) => api.get<{ can_review: boolean; review: SellerReview | null }>(`/market/messages/conversations/${conversationId}/review/`),
  save: (conversationId: number, rating: number, comment: string) => api.put<SellerReview>(`/market/messages/conversations/${conversationId}/review/`, { rating, comment }),
  remove: (conversationId: number) => api.delete(`/market/messages/conversations/${conversationId}/review/`),
}

/** Five stars, filled to the rating (read-only). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} aria-hidden="true" className={cn('size-4', value >= n - 0.25 ? 'fill-amber-400 text-amber-400' : value >= n - 0.75 ? 'fill-amber-400/50 text-amber-400' : 'fill-transparent text-muted-foreground/40')} />
      ))}
    </span>
  )
}

/** Tap a star to choose a rating (radio group, keyboard friendly). */
export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
  return (
    <div className="grid gap-1">
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}, ${labels[n]}`} onClick={() => onChange(n)}
            className="grid size-11 place-items-center rounded-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Star className={cn('size-8', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50')} aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="h-5 text-sm font-semibold text-muted-foreground">{labels[value]}</span>
    </div>
  )
}

/** Seller rating summary plus the latest reviews, for the ad page. */
export function SellerReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<SellerRating | null>(null)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    let alive = true
    reviewsApi.forListing(slug).then(({ data }) => { if (alive) setData(data) }).catch(() => undefined)
    return () => { alive = false }
  }, [slug])
  if (!data) return null
  const shown = showAll ? data.reviews : data.reviews.slice(0, 3)
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Seller reviews</p>
      {data.count && data.average ? (
        <>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl font-extrabold">{data.average.toFixed(1)}</span>
            <Stars value={data.average} />
            <span className="text-sm text-muted-foreground">({data.count} review{data.count > 1 ? 's' : ''})</span>
          </div>
          <ul className="mt-3 grid gap-3">
            {shown.map(review => (
              <li key={review.id} className="border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={review.rating} className="[&_svg]:size-3.5" />
                  <time className="text-xs text-muted-foreground" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </div>
                {review.comment && <p className="mt-1 text-sm leading-relaxed">{review.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{review.reviewer_name}{review.listing_title && <> · bought “{review.listing_title}”</>}</p>
              </li>
            ))}
          </ul>
          {data.reviews.length > 3 && <Button variant="link" className="mt-1 h-auto p-0" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show fewer' : `Show all ${data.reviews.length} reviews`}</Button>}
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No reviews yet. Buyers can rate this seller after chatting with them on {SITE_NAME}.</p>
      )}
    </Card>
  )
}

/** "Rate seller" button and dialog in a chat. Shown only to the buyer, once the seller has replied. */
export function RateSeller({ conversationId, sellerName, refreshKey }: { conversationId: number; sellerName: string; refreshKey?: unknown }) {
  const [status, setStatus] = useState<{ can_review: boolean; review: SellerReview | null } | null>(null)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    reviewsApi.mine(conversationId).then(({ data }) => { if (alive) setStatus(data) }).catch(() => { if (alive) setStatus(null) })
    return () => { alive = false }
  }, [conversationId, refreshKey])
  if (!status?.can_review) return null

  function start() {
    setRating(status?.review?.rating ?? 0); setComment(status?.review?.comment ?? ''); setError(''); setOpen(true)
  }
  async function save() {
    setSaving(true); setError('')
    try {
      const { data } = await reviewsApi.save(conversationId, rating, comment)
      setStatus({ can_review: true, review: data }); setOpen(false)
      toast.success('Thanks for your review', { description: 'It helps other buyers deal safely.' })
    } catch (e) { setError(messageFromError(e, 'We could not save your review.')) }
    finally { setSaving(false) }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={start} className="shrink-0">
        <Star className={cn(status.review && 'fill-amber-400 text-amber-400')} />{status.review ? `You rated ${status.review.rating}★` : 'Rate seller'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate {sellerName}</DialogTitle>
            <DialogDescription>How was dealing with this seller? Your first name and last initial are shown with your review.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {error && <Alert variant="error">{error}</Alert>}
            <StarInput value={rating} onChange={setRating} />
            <div className="grid gap-2">
              <Label htmlFor="review-comment">What should other buyers know? (optional)</Label>
              <Textarea id="review-comment" rows={3} maxLength={1000} placeholder="Was the item as described? Did they show up on time?" value={comment} onChange={event => setComment(event.target.value)} />
            </div>
            <Button variant="cta" disabled={!rating || saving} onClick={() => void save()}>{saving ? <><Loader2 className="animate-spin" />Saving…</> : 'Post review'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
