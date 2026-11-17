import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Heart, Trash2 } from '../lib/site-icons'
import MarketLayout from '../components/MarketLayout'
import { useAuth } from '../lib/auth'
import { marketplaceApi, type Advertisement } from '../lib/marketplace'
import { ListingCard } from './Home'

export default function Favorites() {
  const { profile, ready } = useAuth()
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = () => marketplaceApi.favorites().then(({data}) => setAds(data)).catch(() => setError('Your saved listings could not be loaded.')).finally(() => setLoading(false))
  useEffect(() => { if (profile) void refresh() }, [profile])
  async function remove(slug: string) { try { await marketplaceApi.removeFavorite(slug); setAds(items => items.filter(ad => ad.slug !== slug)) } catch { setError('This listing could not be removed. Please try again.') } }
  if (!ready) return <div className="market-loading">Loading your account…</div>
  if (!profile) return <Navigate to="/login" replace />
  return <MarketLayout title="Saved listings" subtitle="Keep the listings you want to come back to."><div className="myads-toolbar"><Link to="/account" className="market-back">← Account</Link><Link to="/listings" className="sell-button">Browse listings</Link></div>{error && <div className="alert-error">{error}</div>}{loading ? <div className="market-loading">Loading saved listings…</div> : ads.length ? <div className="listing-grid">{ads.map(ad => <article className="favorite-card" key={ad.id}><ListingCard ad={ad}/><button onClick={() => void remove(ad.slug)} aria-label={`Remove ${ad.title} from saved listings`}><Trash2 size={15}/> Remove</button></article>)}</div> : <div className="empty-ads"><Heart size={26}/><h2>No saved listings yet</h2><p>Save items you are interested in and find them here.</p><Link to="/listings" className="sell-button">Explore listings</Link></div>}</MarketLayout>
}
