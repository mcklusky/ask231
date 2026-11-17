import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Eye, Heart, MapPin, MessageCircle, Phone, ShieldCheck, Store, Send } from '../lib/site-icons'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { chatApi } from '../lib/chat'
import { formatCurrencyAmount, formatLocation, marketplaceApi, type Advertisement } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import { ListingCard, formatPrice } from './Home'
import ReportListing from '../components/ReportListing'
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
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [favoriteMessage, setFavoriteMessage] = useState('')

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

  async function toggleFavorite() {
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    try { if (saved) await marketplaceApi.removeFavorite(slug); else await marketplaceApi.addFavorite(slug); setSaved(!saved); setFavoriteMessage(saved ? 'Removed from saved listings.' : 'Saved to your listings.') } catch { setFavoriteMessage('Could not update saved listings. Please try again.') }
  }

  async function messageSeller() {
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    if (!ad) return
    setChatError(''); setStartingChat(true)
    try {
      const { data } = await chatApi.start(ad.slug)
      navigate(`/messages/${data.id}`)
    } catch (e) { setChatError(messageFromError(e, 'We could not start a conversation. Please try again.')) }
    finally { setStartingChat(false) }
  }

  async function sendInlineMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = messageDraft.trim()
    if (!body) return
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    if (!ad) return
    setChatError(''); setStartingChat(true)
    try {
      const { data } = await chatApi.start(ad.slug)
      await chatApi.send(data.id, body)
      setMessageDraft('')
      navigate(`/messages/${data.id}`)
    } catch (e) { setChatError(messageFromError(e, 'Your message could not be sent. Please try again.')) }
    finally { setStartingChat(false) }
  }
  async function makeOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    if (!ad) return
    const amount = Number(offerAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    setChatError(''); setStartingChat(true)
    try {
      const { data } = await chatApi.start(ad.slug)
      await chatApi.send(data.id, `Hello, I’m interested in ${ad.title}. I’d like to offer ${formatCurrencyAmount(amount, ad.currency)}. Would you consider this offer?`)
      navigate(`/messages/${data.id}`)
    } catch (e) { setChatError(messageFromError(e, 'Your offer could not be sent. Please try again.')) }
    finally { setStartingChat(false) }
  }

  if (loading) return <div className="public-market"><div className="detail-loading"><div/><span>Loading listing…</span></div></div>
  if (error || !ad) return <div className="public-market"><div className="detail-error"><Link to="/listings"><ArrowLeft size={15}/> Back to listings</Link><div><Store size={28}/><h1>This listing isn't available</h1><p>{error || 'It may have been removed or is no longer active.'}</p><Link className="market-hero-primary" to="/listings">Explore other listings</Link></div></div></div>

  const image = ad.images[imageIndex]?.image_url
  const phone = ad.phone_number.replace(/[\s()-]/g, '')
  const whatsapp = (ad.whatsapp_number || ad.phone_number).replace(/\D/g, '')
  return <div className="public-market"><PublicHeader />
    <main className="detail-main"><div className="browse-crumb"><Link to="/"><ArrowLeft size={14}/> Home</Link><span>/</span><Link to="/listings">Listings</Link><span>/</span><Link to={`/category/${ad.category.slug}`}>{ad.category.name}</Link></div>
      <div className="detail-layout"><section className="detail-primary"><div className="detail-gallery"><div className="detail-main-image">{image ? <img src={image} alt={ad.images[imageIndex]?.alt_text || ad.title}/> : <div className="listing-placeholder large"><Store size={58}/></div>}{ad.images.length > 1 && <><button aria-label="Previous image" onClick={() => setImageIndex(i => (i - 1 + ad.images.length) % ad.images.length)}><ChevronLeft size={20}/></button><button aria-label="Next image" onClick={() => setImageIndex(i => (i + 1) % ad.images.length)}><ChevronRight size={20}/></button><span>{imageIndex + 1} / {ad.images.length}</span></>}</div>{ad.images.length > 1 && <div className="detail-thumbnails">{ad.images.map((item, index) => <button key={item.id} className={index === imageIndex ? 'selected' : ''} onClick={() => setImageIndex(index)}><img src={item.image_url} alt={item.alt_text || `${ad.title} ${index + 1}`}/></button>)}</div>}</div>
        <div className="detail-description"><div className="detail-section-heading"><h2>Description</h2><span><Eye size={14}/> {ad.views_count.toLocaleString()} views</span></div><p>{ad.description}</p><div className="detail-facts"><div><small>Condition</small><b>{ad.condition === 'new' ? 'New' : 'Used'}</b></div><div><small>Category</small><b>{ad.category.name} · {ad.subcategory.name}</b></div><div><small>Location</small><b>{formatLocation(ad)}</b></div><div><small>Posted</small><b>{new Date(ad.created_at).toLocaleDateString('en-LR', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div></div></div>
      </section>
        <aside className="detail-sidebar"><div className="detail-price-card"><span className="detail-condition">{ad.condition === 'new' ? 'NEW' : 'PRE-OWNED'}</span><h1>{formatPrice(ad)}</h1><h2>{ad.title}</h2><p><MapPin size={14}/>{formatLocation(ad)}</p><button className="favorite-toggle" onClick={() => void toggleFavorite()}><Heart size={16} fill={saved ? "currentColor" : "none"}/>{saved ? "Saved listing" : "Save listing"}</button>{favoriteMessage && <small className="favorite-feedback" role="status">{favoriteMessage}</small>}<button className="detail-offer-toggle" type="button" onClick={() => setShowOfferForm(open => !open)} aria-expanded={showOfferForm}>{showOfferForm ? 'Cancel offer' : 'Make an offer'}</button>{showOfferForm && <form className="detail-offer-form" onSubmit={makeOffer}><label htmlFor="buyer-offer">Your offer</label><div className="detail-offer-input"><span>{ad.currency}</span><input id="buyer-offer" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Enter amount" value={offerAmount} onChange={event => setOfferAmount(event.target.value)} required/></div><button type="submit" disabled={startingChat || !offerAmount || Number(offerAmount) <= 0}>{startingChat ? 'Sending offer…' : profile ? 'Send offer to seller' : 'Sign in to make an offer'}</button><small>Your offer will be sent to the seller in a private chat.</small></form>}<VerifyEmailNotice action="message this seller"/><div className="detail-contact-actions"><button className="detail-message" onClick={() => void messageSeller()} disabled={startingChat}><MessageCircle size={16}/>{startingChat ? 'Opening chat…' : 'Message seller'}</button><a href={`tel:${phone}`} className="detail-call"><Phone size={16}/> Call seller</a><a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, I saw your listing for ${ad.title} on MarketDay.`)}`} target="_blank" rel="noreferrer" className="detail-whatsapp"><MessageCircle size={16}/> WhatsApp</a></div><form className="detail-inline-message" onSubmit={sendInlineMessage}><label htmlFor="detail-message-draft">Message seller</label><textarea id="detail-message-draft" rows={3} maxLength={4000} placeholder="Ask a question about this item…" value={messageDraft} onChange={event => setMessageDraft(event.target.value)} /><button type="submit" disabled={!messageDraft.trim() || startingChat}>{startingChat ? "Sending…" : <><Send size={15}/> Send message</>}</button></form>{chatError && <div className="chat-error detail-chat-error" role="alert">{chatError}</div>}<small className="detail-contact-note"><ShieldCheck size={13}/> Connect directly with the seller. Meet in a safe public place.</small><ReportListing slug={ad.slug}/></div>
          <div className="seller-card"><span className="seller-avatar"><Store size={19}/></span><div className="seller-card-info"><small>LISTED BY</small><b>{ad.seller_name || 'MarketDay seller'} {ad.seller_verified && <BadgeCheck size={15}/>}</b><span>{ad.seller_verified ? 'Verified seller' : 'Community seller'}</span></div><div className="seller-card-badge"><ShieldCheck size={15}/></div></div><div className="seller-safety"><b>Stay safe when buying</b><span>Check the item in person and agree on a safe public meeting place.</span></div>
        </aside>
        </div>
      {similar.length > 0 && <section className="public-section similar-section"><div className="public-section-heading"><div><span className="public-eyebrow">MORE TO EXPLORE</span><h2>Similar listings</h2></div><Link to={`/category/${ad.category.slug}`}>More in {ad.category.name} <ChevronRight size={15}/></Link></div><div className="listing-grid">{similar.map(item => <ListingCard key={item.id} ad={item}/>)}</div></section>}
    </main><footer className="public-footer"><div className="public-footer-bottom"><Link to="/">MarketDay Liberia</Link><span>Local finds. Liberian pride.</span></div></footer></div>
}
