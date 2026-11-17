import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Store } from '../lib/site-icons'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { chatApi } from '../lib/chat'
import { formatCurrencyAmount, formatLocation, marketplaceApi, type Advertisement } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import { ListingCard, formatPrice } from './Home'
import ContactPanel from '@/components/listing/ContactPanel'
import ReportDialog from '@/components/listing/ReportDialog'
import SellerCard from '@/components/listing/SellerCard'
import PublicHeader from '../components/PublicHeader'
import VerifyEmailNotice from '../components/VerifyEmailNotice'

export default function AdvertisementDetail() {
  const { slug = '' } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [ad, setAd] = useState<Advertisement | null>(null)
  const [similar, setSimilar] = useState<Advertisement[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chatError, setChatError] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(''); setImageIndex(0)
    marketplaceApi.advertisement(slug).then(async ({ data }) => {
      if (!alive) return
      setAd(data); setLoading(false)
      try {
        const response = await marketplaceApi.advertisements(1, data.category.slug)
        if (alive) setSimilar(response.data.results.filter(item => item.slug !== data.slug).slice(0, 4))
      } catch { /* Similar listings are optional. */ }
    }).catch(e => { if (alive) { setError(messageFromError(e, 'Please check your connection and try again.')); setLoading(false) } })
    return () => { alive = false }
  }, [slug])

  useEffect(() => { if (!profile || !slug) { setSaved(false); return } marketplaceApi.favorites().then(({data}) => setSaved(data.some(item => item.slug === slug))).catch(() => undefined) }, [profile, slug])

  const goToSignIn = () => navigate(`/login?next=${encodeURIComponent(location.pathname)}`)

  async function toggleFavorite() {
    if (!profile) { goToSignIn(); return }
    try {
      if (saved) { await marketplaceApi.removeFavorite(slug); toast('Removed from saved listings') }
      else { await marketplaceApi.addFavorite(slug); toast.success('Saved to your listings', { action: { label: 'View', onClick: () => navigate('/favorites') } }) }
      setSaved(!saved)
    } catch (e) { toast.error(messageFromError(e, 'Could not update saved listings. Please try again.')) }
  }

  async function messageSeller() {
    if (!profile) { goToSignIn(); return }
    if (!ad) return
    setChatError(''); setStartingChat(true)
    try { const { data } = await chatApi.start(ad.slug); navigate(`/messages/${data.id}`) }
    catch (e) { setChatError(messageFromError(e, 'We could not start a conversation. Please try again.')) }
    finally { setStartingChat(false) }
  }

  /** Start (or reuse) the chat for this listing, send one message, then open the conversation. */
  async function sendToSeller(body: string, sentToast: string, failure: string) {
    if (!profile) { goToSignIn(); return false }
    if (!ad) return false
    setChatError(''); setStartingChat(true)
    try {
      const { data } = await chatApi.start(ad.slug)
      await chatApi.send(data.id, body)
      toast.success(sentToast)
      navigate(`/messages/${data.id}`)
      return true
    } catch (e) { setChatError(messageFromError(e, failure)); return false }
    finally { setStartingChat(false) }
  }
  const sendMessage = (body: string) => sendToSeller(body, 'Message sent', 'Your message could not be sent. Please try again.')
  const sendOffer = (amount: number) => ad
    ? sendToSeller(`Hello, I’m interested in ${ad.title}. I’d like to offer ${formatCurrencyAmount(amount, ad.currency)}. Would you consider this offer?`, 'Offer sent to the seller', 'Your offer could not be sent. Please try again.')
    : Promise.resolve(false)

  if (loading) return <div className="public-market"><div className="detail-loading"><div/><span>Loading listing…</span></div></div>
  if (error || !ad) return <div className="public-market"><div className="detail-error"><Link to="/listings"><ArrowLeft size={15}/> Back to listings</Link><div><Store size={28}/><h1>This listing isn't available</h1><p>{error || 'It may have been removed or is no longer active.'}</p><Link className="market-hero-primary" to="/listings">Explore other listings</Link></div></div></div>

  const image = ad.images[imageIndex]?.image_url
  const phone = ad.phone_number.replace(/[\s()-]/g, '')
  const whatsapp = (ad.whatsapp_number || ad.phone_number).replace(/\D/g, '')
  return <div className="public-market"><PublicHeader />
    <main className="detail-main"><div className="browse-crumb"><Link to="/"><ArrowLeft size={14}/> Home</Link><span>/</span><Link to="/listings">Listings</Link><span>/</span><Link to={`/category/${ad.category.slug}`}>{ad.category.name}</Link></div>
      <div className="detail-layout"><section className="detail-primary"><div className="detail-gallery"><div className="detail-main-image">{image ? <img src={image} alt={ad.images[imageIndex]?.alt_text || ad.title}/> : <div className="listing-placeholder large"><Store size={58}/></div>}{ad.images.length > 1 && <><button aria-label="Previous image" onClick={() => setImageIndex(i => (i - 1 + ad.images.length) % ad.images.length)}><ChevronLeft size={20}/></button><button aria-label="Next image" onClick={() => setImageIndex(i => (i + 1) % ad.images.length)}><ChevronRight size={20}/></button><span>{imageIndex + 1} / {ad.images.length}</span></>}</div>{ad.images.length > 1 && <div className="detail-thumbnails">{ad.images.map((item, index) => <button key={item.id} className={index === imageIndex ? 'selected' : ''} onClick={() => setImageIndex(index)}><img src={item.thumbnail_url || item.image_url} loading="lazy" decoding="async" alt={item.alt_text || `${ad.title} ${index + 1}`}/></button>)}</div>}</div>
        <div className="detail-description"><div className="detail-section-heading"><h2>Description</h2><span><Eye size={14}/> {ad.views_count.toLocaleString()} views</span></div><p>{ad.description}</p><div className="detail-facts"><div><small>Condition</small><b>{ad.condition === 'new' ? 'New' : 'Used'}</b></div><div><small>Category</small><b>{ad.category.name} · {ad.subcategory.name}</b></div><div><small>Location</small><b>{formatLocation(ad)}</b></div><div><small>Posted</small><b>{new Date(ad.created_at).toLocaleDateString('en-LR', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div></div></div>
      </section>
        <aside className="detail-sidebar space-y-3 max-[767px]:mb-3">
          <ContactPanel
            title={ad.title} priceLabel={formatPrice(ad)} priceAmount={Number(ad.price)} currency={ad.currency}
            location={formatLocation(ad)} conditionLabel={ad.condition === 'new' ? 'New' : 'Pre-owned'}
            saved={saved} busy={startingChat} error={chatError}
            onToggleSave={() => void toggleFavorite()} onMessageSeller={() => void messageSeller()}
            onSendMessage={sendMessage} onSendOffer={sendOffer}
            callHref={`tel:${phone}`}
            whatsappHref={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, I saw your listing for ${ad.title} on MarketDay.`)}`}
            notice={<VerifyEmailNotice action="message this seller" />}
            report={<ReportDialog slug={ad.slug} />}
          />
          <SellerCard name={ad.seller_name || 'MarketDay seller'} verified={ad.seller_verified} />
        </aside>
        </div>
      {similar.length > 0 && <section className="public-section similar-section"><div className="public-section-heading"><div><span className="public-eyebrow">MORE TO EXPLORE</span><h2>Similar listings</h2></div><Link to={`/category/${ad.category.slug}`}>More in {ad.category.name} <ChevronRight size={15}/></Link></div><div className="listing-grid">{similar.map(item => <ListingCard key={item.id} ad={item}/>)}</div></section>}
    </main><footer className="public-footer"><div className="public-footer-bottom"><Link to="/">MarketDay Liberia</Link><span>Local finds. Liberian pride.</span></div></footer></div>
}
