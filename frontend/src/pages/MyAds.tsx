import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Advertisement, Paginated } from '../lib/marketplace'
import { formatCurrencyAmount, formatLocation, formatPostedDate, marketplaceApi } from '../lib/marketplace'
import MarketLayout from '../components/MarketLayout'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const STATUS: Record<Advertisement['status'], { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'In review', variant: 'warning' },
  active: { label: 'Live', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  sold: { label: 'Sold', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'danger' },
}

export default function MyAds() {
  const location = useLocation(); const navigate = useNavigate(); const { profile, ready } = useAuth()
  const [data, setData] = useState<Paginated<Advertisement> | null>(null); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState<string | null>(null)

  // A notice handed over from the post/edit form (e.g. "submitted for review") shows once as a toast.
  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice
    if (notice) { toast.success(notice); navigate(location.pathname, { replace: true, state: null }) }
  }, [location, navigate])

  const load = useCallback(async (currentPage: number) => {
    setLoading(true); setError('')
    try { const result = await marketplaceApi.mine(currentPage); setData(result.data) }
    catch (e) { setError(messageFromError(e, 'Could not load your advertisements. Sign in and try again.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { if (profile) void load(page) }, [load, page, profile])

  async function markSold(ad: Advertisement) {
    setBusy(ad.slug); setError('')
    try { await marketplaceApi.markSold(ad.slug); toast.success('Marked as sold', { description: ad.title }); await load(page) }
    catch (e) { setError(messageFromError(e, 'Could not update this advertisement.')) }
    finally { setBusy(null) }
  }
  async function remove(ad: Advertisement) {
    try { await marketplaceApi.remove(ad.slug); toast.success('Advertisement deleted', { description: ad.title }); await load(page) }
    catch (e) { setError(messageFromError(e, 'Could not delete this advertisement.')) }
  }

  if (!ready) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div>
  if (!profile) return <Navigate to="/login?next=/my-ads" replace />
  return (
    <MarketLayout title="My advertisements" subtitle="Create listings and keep your products up to date.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="-ml-3 text-muted-foreground"><Link to="/account"><ArrowLeft />Account</Link></Button>
        <Button asChild variant="cta"><Link to="/ads/new"><Plus />Post an ad</Link></Button>
      </div>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading your advertisements" /></div>
      ) : data?.results.length ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground"><b className="text-foreground">{data.count}</b> {data.count === 1 ? 'advertisement' : 'advertisements'}</p>
          <ul className="grid gap-3 [&>*]:min-w-0">
            {data.results.map(ad => {
              const status = STATUS[ad.status] ?? { label: ad.status, variant: 'outline' as const }
              return (
                <li key={ad.id}>
                  <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground sm:size-24">
                        {ad.images[0] ? <img src={ad.images[0].thumbnail_url || ad.images[0].image_url} loading="lazy" decoding="async" alt={ad.images[0].alt_text || ad.title} className="h-full w-full object-cover" /> : <ImagePlus className="size-6" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><Badge variant={status.variant}>{status.label}</Badge><span className="text-xs text-muted-foreground">{formatPostedDate(ad.created_at)}</span></div>
                        <h2 className="mt-1 line-clamp-2 font-semibold leading-snug">{ad.title}</h2>
                        <p className="font-display font-extrabold text-primary dark:text-brand-primary">{formatCurrencyAmount(Number(ad.price), ad.currency)}</p>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{ad.category.name} · {formatLocation(ad)}</span></p>
                        {ad.status === 'rejected' && ad.rejection_reason && <p className="mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">Review note: {ad.rejection_reason}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {ad.status === 'active' && <Button asChild variant="ghost" size="sm"><Link to={`/ads/${ad.slug}`}><ExternalLink />View</Link></Button>}
                      <Button asChild variant="outline" size="sm"><Link to={`/ads/${ad.slug}/edit`}><Pencil />Edit</Link></Button>
                      {['pending', 'active'].includes(ad.status) && (
                        <Button variant="secondary" size="sm" onClick={() => void markSold(ad)} disabled={busy === ad.slug}>{busy === ad.slug ? <Loader2 className="animate-spin" /> : <Check />}Mark sold</Button>
                      )}
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${ad.title}`}><Trash2 /></Button>}
                        title="Delete this advertisement?" description={<>“{ad.title}” will be removed permanently. This can’t be undone.</>}
                        confirmLabel="Delete" destructive onConfirm={() => remove(ad)}
                      />
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
          {(data.previous || data.next) && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setPage(p => p - 1)} disabled={!data.previous}><ArrowLeft />Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!data.next}>Next<ArrowRight /></Button>
            </div>
          )}
        </>
      ) : (
        <Card className="grid place-items-center gap-3 border-dashed px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><ImagePlus className="size-7" aria-hidden="true" /></span>
          <h2 className="font-display text-xl font-bold">No advertisements yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Your listings will appear here after you post them. Ads with clear photos sell faster.</p>
          <Button asChild variant="cta"><Link to="/ads/new"><Plus />Post your first ad</Link></Button>
        </Card>
      )}
    </MarketLayout>
  )
}
