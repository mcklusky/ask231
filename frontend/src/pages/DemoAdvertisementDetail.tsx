import { ArrowLeft, ArrowRight, BadgeCheck, MapPin } from '../lib/site-icons'
import { useState } from 'react'
import { toast } from 'sonner'
import ContactPanel from '@/components/listing/ContactPanel'
import ReportDialog from '@/components/listing/ReportDialog'
import SellerCard from '@/components/listing/SellerCard'
import { Link, useParams } from 'react-router-dom'
import { demoProducts } from './Home'
import PublicHeader from '../components/PublicHeader'

export default function DemoAdvertisementDetail() {
  const { slug = '' } = useParams()
  const product = demoProducts.find(item => item.slug === slug)
  const [saved, setSaved] = useState(false)
  // Demo listings have no real seller: every action explains what would happen on a real ad.
  const demoNote = (action: string) => toast.info('This is a sample listing', { description: `On real ads, ${action}` })
  const demoSend = async (action: string) => { demoNote(action); return true }
  if (!product) return <div className="public-market"><main className="demo-detail-missing"><h1>Sample listing not found</h1><Link to="/">Return to MarketDay <ArrowRight size={15}/></Link></main></div>
  const Icon = product.icon
  const currency = product.price.startsWith('US$') ? 'USD' : 'LRD'
  const priceAmount = Number(product.price.replace(/[^0-9.]/g, ''))
  const related = demoProducts.filter(item => item.category === product.category && item.slug !== product.slug).slice(0, 4)
  const fallbackRelated = related.length ? related : demoProducts.filter(item => item.slug !== product.slug).slice(0, 4)
  return <div className="public-market jiji-market"><PublicHeader />
    <main className="detail-main demo-detail-main"><div className="browse-crumb"><Link to="/"><ArrowLeft size={14}/> Home</Link><span>/</span><Link to="/listings">Listings</Link><span>/</span><b>{product.category}</b></div>
      <div className="demo-detail-notice"><span>DEMO LISTING</span><p>This sample shows how a product page works. Seller contact information is shown only on real ads.</p></div>
      <div className="detail-layout"><section className="detail-primary"><div className="detail-gallery"><div className={`demo-detail-art demo-product-art ${product.tone}`}><Icon size={116} strokeWidth={1.1}/><span>DEMO ITEM</span><small>{product.condition}</small><div className="demo-image-caption">Sample product artwork</div></div></div><div className="detail-description"><div className="detail-section-heading"><h2>Description</h2><span><BadgeCheck size={14}/> Sample ad</span></div><p>{product.description}</p><div className="detail-facts"><div><small>Condition</small><b>{product.condition}</b></div><div><small>Category</small><b>{product.category}</b></div><div><small>Location</small><b>{product.location}</b></div><div><small>Seller</small><b>MarketDay sample seller</b></div></div></div></section>
        <aside className="detail-sidebar space-y-3 max-[767px]:mb-3">
          <ContactPanel
            title={product.title} priceLabel={product.price} priceAmount={priceAmount} currency={currency}
            location={product.location} conditionLabel={product.condition === 'Used' ? 'Pre-owned' : product.condition}
            saved={saved}
            onToggleSave={() => { setSaved(v => !v); toast.success(saved ? 'Removed from saved listings' : 'Saved (sample listing)') }}
            onMessageSeller={() => demoNote('this opens a private chat with the seller.')}
            onSendMessage={() => demoSend('your message goes straight to the seller’s inbox.')}
            onSendOffer={() => demoSend('your offer is sent to the seller in a private chat.')}
            onCall={() => demoNote('this calls the seller’s phone.')}
            onWhatsApp={() => demoNote('this opens WhatsApp with the seller.')}
            report={<ReportDialog slug={product.slug} requireSignIn={false} onSubmit={() => { demoNote('reports go to our team for review.') }} />}
          />
          <SellerCard name="MarketDay sample seller" verified={false} note="Preview profile" />
        </aside></div>
      {fallbackRelated.length > 0 && <section className="market-home-section demo-related"><div className="market-home-section-heading"><div><span className="public-eyebrow">MORE TO EXPLORE</span><h2>Similar listings</h2></div><Link to="/listings">Browse all <ArrowRight size={15}/></Link></div><div className="listing-grid">{fallbackRelated.map(item => { const RelatedIcon = item.icon; return <Link to={`/ads/demo/${item.slug}`} className="listing-card demo-product-card" key={item.slug}><div className={`demo-product-art ${item.tone}`}><RelatedIcon size={54} strokeWidth={1.15}/><span>DEMO</span><small>{item.condition}</small></div><div className="listing-card-body"><b className="listing-card-price">{item.price}</b><h3>{item.title}</h3><div className="listing-card-location"><MapPin size={12}/>{item.location}</div></div></Link> })}</div></section>}
    </main><footer className="public-footer"><div className="public-footer-bottom"><Link to="/">MarketDay Liberia</Link><span>Local finds. Liberian pride.</span></div></footer></div>
}
