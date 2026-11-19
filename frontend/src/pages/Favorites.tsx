import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Heart, HeartOff, Loader2, Search } from 'lucide-react'
import MarketLayout from '../components/MarketLayout'
import { useAuth } from '../lib/auth'
import { marketplaceApi, type Advertisement } from '../lib/marketplace'
import { ListingCard } from './Home'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Favorites() {
  const { profile, ready } = useAuth()
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!profile) return
    marketplaceApi.favorites().then(({ data }) => setAds(data)).catch(() => setError('Your saved listings could not be loaded.')).finally(() => setLoading(false))
  }, [profile])

  async function remove(ad: Advertisement) {
    try {
      await marketplaceApi.removeFavorite(ad.slug)
      setAds(items => items.filter(item => item.slug !== ad.slug))
      toast('Removed from saved listings', {
        description: ad.title,
        action: { label: 'Undo', onClick: () => { void marketplaceApi.addFavorite(ad.slug).then(() => setAds(items => [ad, ...items])).catch(() => toast.error('Could not restore that listing.')) } },
      })
    } catch { toast.error('This listing could not be removed. Please try again.') }
  }

  if (!ready) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div>
  if (!profile) return <Navigate to="/login?next=/favorites" replace />
  return (
    <MarketLayout title="Saved listings" subtitle="Keep the listings you want to come back to." eyebrow="Your marketplace">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="-ml-3 text-muted-foreground"><Link to="/account"><ArrowLeft />Account</Link></Button>
        <Button asChild variant="outline"><Link to="/listings"><Search />Browse listings</Link></Button>
      </div>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading saved listings" /></div>
      ) : ads.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          {ads.map(ad => (
            <li key={ad.id} className="flex flex-col gap-1.5">
              <ListingCard ad={ad} />
              <Button size="sm" variant="ghost" onClick={() => void remove(ad)} aria-label={`Remove ${ad.title} from saved listings`}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <HeartOff />Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="grid place-items-center gap-3 border-dashed px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent"><Heart className="size-7" aria-hidden="true" /></span>
          <h2 className="font-display text-xl font-bold">No saved listings yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Tap <b>Save</b> on any listing to keep it here for later.</p>
          <Button asChild variant="cta"><Link to="/listings"><Search />Explore listings</Link></Button>
        </Card>
      )}
    </MarketLayout>
  )
}
