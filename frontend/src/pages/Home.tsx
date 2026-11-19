import { Anchor, ArrowRight, Baby, BadgeCheck, Bike, BriefcaseBusiness, Building2, BusFront, Camera, CarFront, ChevronRight, Construction, Dumbbell, Factory, FileText, Hammer, Headphones, HeartPulse, Laptop, MapPin, Package, PawPrint, Plug, Settings2, Shirt, Smartphone, Sofa, Sparkles, Sprout, Store, Tablet, Truck, Watch, Wrench, type LucideIcon } from '../lib/site-icons'
import { RefreshCw, Search as SearchGlyph } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { formatCurrencyAmount, formatLocation, formatPostedDate, liberianCounties, marketplaceApi, type Advertisement, type Category, type County } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import PublicHeader from '../components/PublicHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstallAppCard } from '@/components/InstallApp'
import HomeRequests from '@/components/HomeRequests'
import { SocialLinks, WhatsAppChannelCard } from '@/components/SocialLinks'
import { COUNTRY_ADJECTIVE, COUNTRY_NAME, SITE_NAME } from '@/config/site'
import { BrandLockup, LogoMark } from '@/components/Brand'

const categoryIllustrations: Record<string, LucideIcon> = { vehicles: CarFront, property: Building2, 'mobile-phones': Smartphone, electronics: Laptop, 'home-and-furniture': Sofa, fashion: Shirt, jobs: BriefcaseBusiness, services: Wrench, agriculture: Sprout, 'food-agriculture-farming': Sprout, 'animals-and-pets': PawPrint, 'commercial-equipment': Factory, 'sports-and-hobbies': Dumbbell, 'beauty-personal-care': Sparkles, 'repair-construction': Hammer, 'babies-kids': Baby, 'seeking-work-cvs': FileText, 'business-industry': Building2, 'other-products': Package }
const subcategoryIcons: Record<string, LucideIcon> = { 'vehicle-parts-accessories': Settings2, cars: CarFront, 'motorcycles-scooters': Bike, 'buses-microbuses': BusFront, 'trucks-trailers': Truck, 'construction-heavy-machinery': Construction, 'boats-watercraft': Anchor, 'watercraft-boats': Anchor, 'personal-mobility': Bike, 'auto-services': Wrench, 'mobile-phones': Smartphone, 'accessories-for-phones-tablets': Plug, 'smart-watches': Watch, tablets: Tablet, headphones: Headphones }
const previewCategories = [{ name: 'Vehicles', slug: 'vehicles' }, { name: 'Property', slug: 'property' }, { name: 'Phones & Tablets', slug: 'mobile-phones' }, { name: 'Electronics', slug: 'electronics' }, { name: 'Home, Furniture & Appliances', slug: 'home-and-furniture' }, { name: 'Fashion', slug: 'fashion' }, { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' }, { name: 'Services', slug: 'services' }, { name: 'Repair & Construction', slug: 'repair-construction' }, { name: 'Commercial Equipment & Tools', slug: 'commercial-equipment' }, { name: 'Leisure & Activities', slug: 'sports-and-hobbies' }, { name: 'Babies & Kids', slug: 'babies-kids' }, { name: 'Food, Agriculture & Farming', slug: 'agriculture' }, { name: 'Animals & Pets', slug: 'animals-and-pets' }, { name: 'Jobs', slug: 'jobs' }, { name: 'Seeking Work & CVs', slug: 'seeking-work-cvs' }, { name: 'Business & Industry', slug: 'business-industry' }, { name: 'Other Products', slug: 'other-products' }]
export const demoProducts = [
  { slug: 'samsung-galaxy-a54', title: 'Samsung Galaxy A54', price: 'L$ 28,500', category: 'Phones & tablets', location: 'Paynesville, Montserrado', condition: 'Used', icon: Smartphone, tone: 'phone', description: 'Sample listing for a Samsung Galaxy A54 in good condition. This preview shows how a seller’s photos, item details, price, and location will appear.' },
  { slug: 'hp-elitebook-840', title: 'HP EliteBook 840 G8', price: 'US$ 420', category: 'Computers & electronics', location: 'Monrovia, Montserrado', condition: 'Used', icon: Laptop, tone: 'laptop', description: 'Sample listing for a lightweight business laptop. Add battery health, memory, storage, and included accessories to a real listing.' },
  { slug: 'modern-3-seat-sofa', title: 'Modern 3-seat sofa', price: 'L$ 46,000', category: 'Home & furniture', location: 'Buchanan, Grand Bassa', condition: 'New', icon: Sofa, tone: 'sofa', description: 'Sample listing for a comfortable three-seat sofa. A real seller can include dimensions, fabric details, delivery options, and several photos.' },
  { slug: 'city-commuter-bicycle', title: 'City commuter bicycle', price: 'L$ 12,800', category: 'Sports & outdoors', location: 'Gbarnga, Bong', condition: 'Used', icon: Bike, tone: 'bike', description: 'Sample listing for a city bicycle. Buyers can review the condition, location, and seller information before contacting the owner.' },
  { slug: 'african-print-dress', title: 'African print summer dress', price: 'L$ 4,200', category: 'Fashion', location: 'Kakata, Margibi', condition: 'New', icon: Shirt, tone: 'fashion', description: 'Sample listing for a new African print dress. A real ad can add available sizes, fabric details, and pickup arrangements.' },
  { slug: 'garden-produce-box', title: 'Fresh garden produce box', price: 'L$ 1,650', category: 'Food & agriculture', location: 'Zwedru, Grand Gedeh', condition: 'Fresh', icon: Sprout, tone: 'produce', description: 'Sample listing for a box of fresh local produce. Sellers can describe what is in season and when it is ready for pickup.' },
  { slug: 'canon-eos-2000d', title: 'Canon EOS 2000D camera', price: 'US$ 315', category: 'Cameras & accessories', location: 'Monrovia, Montserrado', condition: 'Used', icon: Camera, tone: 'camera', description: 'Sample listing for a Canon EOS camera. A real seller can list the lens, shutter condition, included equipment, and more photos.' },
  { slug: 'wood-bedside-table', title: 'Solid wood bedside table', price: 'L$ 8,900', category: 'Home & furniture', location: 'Harper, Maryland', condition: 'New', icon: Building2, tone: 'table', description: 'Sample listing for a handcrafted bedside table. Product dimensions and finish details can be added by the seller.' },
]
export function formatPrice(ad: Advertisement) { return formatCurrencyAmount(Number(ad.price), ad.currency) }
export function ListingCard({ ad }: { ad: Advertisement }) {
  const image = ad.images[0]?.thumbnail_url || ad.images[0]?.image_url
  const CategoryIcon = categoryIllustrations[ad.category.slug] || Package
  return (
    <Link to={`/ads/${ad.slug}`} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image
            ? <img src={image} alt={ad.images[0]?.alt_text || ad.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            : <div className="grid h-full place-items-center text-muted-foreground"><CategoryIcon className="size-10" strokeWidth={1.5} aria-hidden="true" /></div>}
          <Badge variant="overlay" className="absolute left-2.5 top-2.5">{ad.condition === 'new' ? 'New' : 'Used'}</Badge>
          {ad.seller_verified && <Badge variant="default" className="absolute right-2.5 top-2.5 gap-1 shadow-sm"><BadgeCheck aria-hidden="true" />Verified</Badge>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          <p className="font-display text-lg font-extrabold leading-tight text-primary dark:text-brand-primary">{formatPrice(ad)}</p>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{ad.title}</h3>
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{formatLocation(ad)}</span></p>
          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5 text-xs text-muted-foreground">
            <span className="truncate">{ad.category.name}</span>
            <time dateTime={ad.created_at} className="shrink-0">{formatPostedDate(ad.created_at)}</time>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// Sample listings are a local-development aid only; production visitors never see them.
const showDemoListings = import.meta.env.DEV

function DemoProductGrid() {
  return <><div className="demo-inventory-note"><span>DEMO INVENTORY</span><p>Sample products to preview the marketplace. Real listings will appear here as sellers post ads.</p></div><div className="listing-grid demo-product-grid">{demoProducts.map(product => { const Icon = product.icon; return <Link to={`/ads/demo/${product.slug}`} className="listing-card demo-product-card" key={product.title}><div className={`demo-product-art ${product.tone}`}><Icon size={62} strokeWidth={1.15}/><span>DEMO</span><small>{product.condition}</small></div><div className="listing-card-body"><b className="listing-card-price">{product.price}</b><h3>{product.title}</h3><div className="listing-card-location"><MapPin size={12}/>{product.location}</div><div className="listing-card-foot"><span>{product.category}</span><span>Details <ArrowRight size={12}/></span></div></div></Link> })}</div></>
}

const businessTypes = [
  { label: 'Supermarkets & groceries', term: 'groceries', icon: Store, detail: 'Food, drinks, and daily essentials' },
  { label: 'Pharmacies & health', term: 'pharmacy', icon: HeartPulse, detail: 'Health products and personal care' },
  { label: 'Electronics & appliances', term: 'electronics', icon: Laptop, detail: 'Phones, computers, and home tech' },
  { label: 'Home & hardware', term: 'home hardware', icon: Building2, detail: 'Furniture, building, and repair' },
  { label: 'Fashion & department stores', term: 'fashion', icon: Shirt, detail: 'Clothing, shoes, and accessories' },
  { label: 'Auto & spare parts', term: 'auto parts', icon: CarFront, detail: 'Vehicles, parts, and accessories' },
]

function BusinessDirectory({ open }: { open: boolean }) {
  return <section className="home-business-menu" id="home-business-menu" aria-label="Shop local businesses" hidden={!open}><div className="business-directory-heading"><div><h2>Find a business for every need</h2><p>Explore supermarkets, pharmacies, electronics shops, and more across {COUNTRY_NAME}.</p></div><Link to="/listings">Browse all listings <ArrowRight size={15} /></Link></div><div className="business-type-grid">{businessTypes.map(({ label, term, icon: Icon, detail }) => <Link to={`/listings?q=${encodeURIComponent(term)}`} className="business-type-card" key={label}><span className="business-type-icon"><Icon size={20} aria-hidden="true" /></span><span className="business-type-copy"><b>{label}</b><small>{detail}</small></span><ChevronRight size={17} className="business-type-arrow" aria-hidden="true" /></Link>)}</div><div className="business-directory-cta"><span><Store size={17} aria-hidden="true" /><b>Run a business?</b><small>Reach more local customers on {SITE_NAME}.</small></span><Link to="/register">Create a seller account <ArrowRight size={14} /></Link></div></section>
}

function CategoryBrowser({ categories, loading }: { categories: Category[]; loading: boolean }) {
  const [activeSlug, setActiveSlug] = useState('vehicles')
  const [showSubcategories, setShowSubcategories] = useState(false)
  useEffect(() => { if (!categories.some(category => category.slug === activeSlug) && categories[0]) setActiveSlug(categories[0].slug) }, [categories, activeSlug])
  const active = categories.find(category => category.slug === activeSlug) || categories[0]
  if (!active) return null
  const ActiveIcon = categoryIllustrations[active.slug] || Package
  return <section className={`category-browser ${showSubcategories ? 'has-active-category' : ''}`} aria-label="Browse marketplace categories" onMouseLeave={() => setShowSubcategories(false)}>
    <div className="category-browser-heading"><span className="public-eyebrow">BROWSE CATEGORIES</span><span>{categories.length} categories</span></div>
    <div className="category-browser-columns">
      <div className="category-browser-list" role="group" aria-label="Categories">{categories.map(category => { const CategoryIcon = categoryIllustrations[category.slug] || Package; const selected = category.slug === active.slug; return <button key={category.slug} className={`category-browser-item ${selected ? 'selected' : ''} ${category.slug === 'repair-construction' ? 'repair-construction-category' : ''}`} type="button" aria-pressed={selected} onMouseEnter={() => { setActiveSlug(category.slug); setShowSubcategories(true) }} onFocus={() => { setActiveSlug(category.slug); setShowSubcategories(true) }} onClick={() => { setActiveSlug(category.slug); setShowSubcategories(true) }}><span className="category-browser-icon" aria-hidden="true"><CategoryIcon size={19} strokeWidth={1.75}/></span><span className="category-browser-copy"><b>{category.name}</b><small>{(category.ad_count || 0).toLocaleString()} ads</small></span><ChevronRight size={17} className="category-browser-chevron"/></button> })}</div>
      <div className="category-browser-subcategories" role="region" aria-label={`${active.name} subcategories`}><div className="category-subcategory-heading"><span className="category-browser-icon" aria-hidden="true"><ActiveIcon size={19} strokeWidth={1.75}/></span><div><b>{active.name}</b><small>{(active.ad_count || 0).toLocaleString()} ads</small></div><Link to={`/category/${active.slug}`}>View all <ArrowRight size={14}/></Link></div>{active.subcategories.length ? <div className="category-subcategory-list">{active.subcategories.map(sub => { const SubcategoryIcon = subcategoryIcons[sub.slug] || categoryIllustrations[active.slug] || Package; return <Link key={sub.id} to={`/category/${active.slug}?subcategory=${encodeURIComponent(sub.slug)}`}><span className="category-subcategory-icon" aria-hidden="true"><SubcategoryIcon size={19} strokeWidth={1.75}/></span><span className="category-subcategory-copy"><span>{sub.name}</span><small>{(sub.ad_count || 0).toLocaleString()} ads</small></span>{sub.slug === 'auto-services' && <ChevronRight size={17} className="category-browser-chevron"/>}</Link>})}</div> : <div className="category-subcategory-empty" role={loading ? 'status' : undefined}>{loading ? 'Loading subcategories…' : 'No subcategories are listed for this category yet.'}</div>}</div>
    </div>
  </section>
}

export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [counties, setCounties] = useState<County[]>(liberianCounties)
  const [ads, setAds] = useState<Advertisement[]>([])
  const [popular, setPopular] = useState<Advertisement[]>([])
  const [promoted, setPromoted] = useState<Advertisement[]>([])
  const [query, setQuery] = useState('')
  const [county, setCounty] = useState('')
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState('') // category/county failures fall back to built-in lists
  const [adsError, setAdsError] = useState('')
  useEffect(() => {
    let alive = true
    marketplaceApi.categories().then(({ data }) => { if (alive) setCategories(data.results) }).catch(e => { if (alive) setError(messageFromError(e, 'Could not load marketplace categories.')) }).finally(() => { if (alive) setCategoriesLoading(false) })
    marketplaceApi.counties().then(({ data }) => { if (alive) setCounties(data.results.length ? data.results : liberianCounties) }).catch(e => { if (alive) { setCounties(liberianCounties); setError(messageFromError(e, 'Could not load county locations.')) } })
    Promise.all([marketplaceApi.advertisements(1), marketplaceApi.popular(), marketplaceApi.promoted()]).then(([listings, popularItems, promotedItems]) => { if (!alive) return; setAds(listings.data.results); setPopular(popularItems.data); setPromoted(promotedItems.data) }).catch(e => { if (alive) setAdsError(messageFromError(e, 'Please check your connection and try again.')) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])
  function searchListings(event: FormEvent) { event.preventDefault(); const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (county) params.set('county', county); navigate(`/listings${params.size ? `?${params}` : ''}`) }
  const shownAds = popular.length ? popular : ads
  const categoryItems: Category[] = categories.length ? categories : previewCategories.map((category, index) => ({ ...category, id: index + 1, description: '', icon: '', is_active: true, sort_order: index, subcategories: [], ad_count: 0 }))
  return <div className="public-market jiji-market" onClickCapture={event => { if (!(event.target as HTMLElement).closest('.home-search-bar')) setBusinessMenuOpen(false) }}>
    <PublicHeader />
    <main>
      <section className="market-search-band"><div className="market-search-inner"><span className="market-kicker"><span /> {COUNTRY_NAME.toUpperCase()}'S BUY &amp; SELL MARKETPLACE</span><h1>What are you looking for?</h1><p>Buy and sell with people in your community.</p><form className="marketplace-search home-search-bar" onSubmit={searchListings} onFocusCapture={event => { if ((event.target as HTMLElement).closest('.home-search-row')) setBusinessMenuOpen(true) }} onKeyDownCapture={event => { if (event.key === 'Escape') setBusinessMenuOpen(false) }} onClickCapture={event => { if ((event.target as HTMLElement).closest('.home-search-row')) setBusinessMenuOpen(true); else if ((event.target as HTMLElement).closest('.home-location-row')) setBusinessMenuOpen(false) }}><div className="home-search-anchor"><div className="home-search-row"><label className="market-search-input"><input aria-label="Search products and services" aria-expanded={businessMenuOpen} aria-controls="home-business-menu" placeholder="I am looking for..." value={query} onChange={event => setQuery(event.target.value)} /></label><button type="submit" aria-label="Search"><SearchGlyph size={19} aria-hidden="true"/></button></div><BusinessDirectory open={businessMenuOpen} /></div><label className="home-location-row"><MapPin size={16} aria-hidden="true"/><span>Location</span><select aria-label="Choose a county" value={county} onChange={event => setCounty(event.target.value)}><option value="">Any location</option>{counties.map(place => <option value={place.slug} key={place.id}>{place.name}</option>)}</select></label></form></div></section>
      <section className="market-feature-banner"><div className="market-feature-copy"><span>LOCAL FINDS · BIG POSSIBILITIES</span><h2>Good finds are closer <br/>than you think.</h2><p>Shop directly from people and businesses across {COUNTRY_NAME}.</p><div className="mt-5"><Button asChild variant="cta" size="lg"><Link to="/listings">Explore the marketplace <ArrowRight /></Link></Button></div></div><div className="market-feature-art" aria-hidden="true"><div className="feature-orbit"/><span className="feature-product feature-product-phone"><Smartphone size={36}/></span><span className="feature-product feature-product-home"><Sofa size={34}/></span><span className="feature-product feature-product-laptop"><Laptop size={35}/></span><span className="feature-product feature-product-fashion"><Shirt size={31}/></span><div className="feature-note"><MapPin size={15}/><span><b>Right here at home</b><small>Across all 15 counties</small></span></div></div></section>
      <div className="marketplace-home-layout"><CategoryBrowser categories={categoryItems} loading={categoriesLoading}/><div className="marketplace-home-content"><section className="market-welcome-strip"><div><BadgeCheck size={18}/><span><b>Buy smarter.</b> Shop local finds from across {COUNTRY_NAME}.</span></div><span className="market-welcome-location"><MapPin size={14}/> +231 · 15 counties</span></section><InstallAppCard/>
          <section className="market-home-section"><div className="market-home-section-heading"><div><span className="public-eyebrow">POPULAR AROUND {COUNTRY_NAME.toUpperCase()}</span><h2>Trending ads</h2></div><Link to="/listings">View all <ArrowRight size={15}/></Link></div>{loading ? <div className="listing-grid">{[1,2,3,4,5,6,7,8].map(n => <div className="listing-skeleton" key={n}><div/><span/><i/></div>)}</div> : shownAds.length ? <div className="listing-grid">{shownAds.slice(0,12).map(ad => <ListingCard key={ad.id} ad={ad}/>)}</div> : <>{adsError ? <div className="home-empty" role="alert"><span className="home-empty-icon"><RefreshCw size={22} aria-hidden="true"/></span><h3>We couldn't load listings</h3><p>{adsError}</p><Button type="button" variant="default" onClick={() => window.location.reload()}><RefreshCw /> Try again</Button></div> : <div className="home-empty"><span className="home-empty-icon"><Store size={22} aria-hidden="true"/></span><h3>{SITE_NAME} is just getting started</h3><p>No ads have been posted yet. Be the first to sell to buyers across {COUNTRY_NAME}.</p><Button asChild variant="cta"><Link to={profile ? '/ads/new' : '/register'}>{profile ? 'Post the first ad' : 'Sign up to sell'} <ArrowRight /></Link></Button></div>}{showDemoListings && <DemoProductGrid/>}</>}</section>
          <HomeRequests/>
          <WhatsAppChannelCard/>
          {promoted.length > 0 && <section className="market-home-section"><div className="market-home-section-heading"><div><span className="public-eyebrow">HANDPICKED FOR YOU</span><h2>Featured listings</h2></div><Link to="/listings">Browse more <ArrowRight size={15}/></Link></div><div className="listing-grid">{promoted.slice(0,8).map(ad => <ListingCard key={ad.id} ad={ad}/>)}</div></section>}
        </div>
      </div>
      <section className="market-sell-promo"><div><span className="public-eyebrow">SELL FASTER</span><h2>Have something to sell?</h2><p>Post an ad and connect with buyers near you.</p></div><div className="shrink-0"><Button asChild variant="cta" size="lg"><Link to={profile ? '/ads/new' : '/register'}>Post an ad <ArrowRight /></Link></Button></div></section>
    </main><footer className="public-footer"><div className="public-footer-main"><Link to="/" className="brand"><LogoMark /><BrandLockup /></Link><p>Local finds. {COUNTRY_ADJECTIVE} pride.</p><div><Link to="/listings">Browse listings</Link><Link to="/account">My account</Link><Link to="/register">Start selling</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div><SocialLinks/></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} {SITE_NAME}</span><span>Connecting communities, one find at a time.</span></div></footer>
  </div>
}
