import { ArrowLeft, ArrowRight, Store, SlidersHorizontal } from '../lib/site-icons'
import { MapPin, Search as SearchGlyph } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ListingCard } from './Home'
import { liberianCounties, marketplaceApi, type Advertisement, type Category, type County } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import PublicHeader from '../components/PublicHeader'

export default function Listings() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const countySlug = searchParams.get('county') || ''
  const subcategorySlug = searchParams.get('subcategory') || ''
  const [filters, setFilters] = useState({ town: searchParams.get('town') || '', country: searchParams.get('country') || '', subcategory: subcategorySlug, condition: searchParams.get('condition') || '', currency: searchParams.get('currency') || '', min_price: searchParams.get('min_price') || '', max_price: searchParams.get('max_price') || '', ordering: searchParams.get('ordering') || '-created_at' })
  const [searchInput, setSearchInput] = useState(query)
  const [countyInput, setCountyInput] = useState(countySlug)
  const [counties, setCounties] = useState<County[]>(liberianCounties)
  const [category, setCategory] = useState<Category | null>(null)
  const [ads, setAds] = useState<Advertisement[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => { setSearchInput(query); setCountyInput(countySlug); setPage(1) }, [query, countySlug])
  useEffect(() => { setFilters(f => f.subcategory === subcategorySlug ? f : { ...f, subcategory: subcategorySlug }); setPage(1) }, [subcategorySlug])
  useEffect(() => { marketplaceApi.counties().then(({ data }) => setCounties(data.results.length ? data.results : liberianCounties)).catch(() => setCounties(liberianCounties)) }, [])
  useEffect(() => { let alive = true; setPage(1); if (!slug) { setCategory(null); return () => { alive = false } } marketplaceApi.categories().then(({ data }) => { if (alive) setCategory(data.results.find(c => c.slug === slug) || null) }).catch(() => { if (alive) setCategory(null) }); return () => { alive = false } }, [slug])
  useEffect(() => { let alive = true; setLoading(true); setError(''); marketplaceApi.advertisements(page, slug, query, { county: countySlug, ...filters }).then(({ data }) => { if (!alive) return; setAds(data.results); setHasNext(Boolean(data.next)); setHasPrevious(Boolean(data.previous)); setLoading(false) }).catch(e => { if (alive) { setError(messageFromError(e, 'Please check your connection and try again.')); setLoading(false) } }); return () => { alive = false } }, [page, slug, query, countySlug, filters])
  function submitSearch(event: FormEvent) { event.preventDefault(); const next = new URLSearchParams(); if (searchInput.trim()) next.set('q', searchInput.trim()); if (countyInput) next.set('county', countyInput); Object.entries(filters).forEach(([key,value]) => { if(value) next.set(key,value) }); setSearchParams(next); setPage(1) }
  const activeFilterCount = [countySlug, filters.country, filters.town, filters.condition, filters.currency, filters.min_price, filters.max_price].filter(Boolean).length
  function clearFilters() {
    setSearchInput('')
    setCountyInput('')
    setFilters({ town: '', country: '', subcategory: subcategorySlug, condition: '', currency: '', min_price: '', max_price: '', ordering: '-created_at' })
    setSearchParams(subcategorySlug ? { subcategory: subcategorySlug } : {})
    setPage(1)
  }
  const sortLabels: Record<string, string> = { '-created_at': 'Newest first', created_at: 'Oldest first', price: 'Price: low to high', '-price': 'Price: high to low' }
  const activeCounty = counties.find(place => place.slug === countySlug)
  return <div className="public-market browse-market"><PublicHeader /><main className="browse-main"><div className="browse-crumb"><Link to="/"><ArrowLeft size={14} /> Home</Link><span>/</span>{category ? <><Link to="/listings">Listings</Link><span>/</span><b>{category.name}</b></> : <b>All listings</b>}</div>
    <form className="marketplace-search browse-search" onSubmit={submitSearch}>
      <div className="listing-search-row">
        <label className="market-search-input"><input aria-label="Search products and services" placeholder="Search listings by name or keyword" value={searchInput} onChange={event => setSearchInput(event.target.value)} /></label>
        <button type="submit" aria-label="Search"><SearchGlyph size={19} aria-hidden="true"/></button>
      </div>
      <label className="browse-location-row"><MapPin size={16} aria-hidden="true"/><span>Location</span><select aria-label="Choose a county" value={countyInput} onChange={event => {setCountyInput(event.target.value);setFilters(f=>({...f,town:''}))}}><option value="">Any location</option>{counties.map(place => <option value={place.slug} key={place.id}>{place.name}</option>)}</select></label>

    </form>
    <div className="browse-heading"><div><span className="public-eyebrow">MARKETDAY · LIBERIA</span><h1>{query ? `Results for “${query}”` : category?.name || 'Explore local listings'}</h1><p>{activeCounty ? `Available in ${activeCounty.name}, Liberia.` : category?.description || 'Browse products from Liberia and sellers abroad.'}</p></div><span className="browse-sort">{sortLabels[filters.ordering] || 'Newest first'}</span></div><div className="browse-content-layout"><aside className={`browse-filter-sidebar${filtersOpen ? ' is-open' : ''}`} aria-label="Refine listings"><button type="button" className="browse-filter-toggle" aria-expanded={filtersOpen} aria-controls="listing-filters" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true"/> {filtersOpen ? 'Hide filters' : 'Filters & sort'}{activeFilterCount > 0 && <span className="browse-filter-count">{activeFilterCount}</span>}</button>      <section className="listing-filter-row" id="listing-filters" aria-label="Listing filters">
        <div className="listing-filter-heading"><span><SlidersHorizontal size={16} aria-hidden="true"/> Refine your search</span><div><small>{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active` : 'Choose any filters to narrow results'}</small>{activeFilterCount > 0 && <button type="button" className="clear-filters" onClick={clearFilters}>Clear all</button>}</div></div>
        <label className="listing-filter-field"><span>Country</span><input aria-label="Country" placeholder="Any country" value={filters.country} onChange={e=>setFilters(f=>({...f,country:e.target.value}))} /></label>
        <label className="listing-filter-field"><span>Town or city</span><input aria-label="Town or city" placeholder="Any town or city" value={filters.town} onChange={e=>setFilters(f=>({...f,town:e.target.value}))} /></label>
        <label className="listing-filter-field"><span>Condition</span><select aria-label="Condition" value={filters.condition} onChange={e=>setFilters(f=>({...f,condition:e.target.value}))}><option value="">Any condition</option><option value="new">New</option><option value="used">Used</option></select></label>
        <label className="listing-filter-field"><span>Currency code</span><input aria-label="Currency code" maxLength={3} placeholder="Any currency" value={filters.currency} onChange={e=>setFilters(f=>({...f,currency:e.target.value.toUpperCase()}))} /></label>
        <fieldset className="listing-price-field"><legend>Price range</legend><div><label><span className="sr-only">Minimum price</span><input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={filters.min_price} onChange={e=>setFilters(f=>({...f,min_price:e.target.value}))}/></label><span aria-hidden="true">–</span><label><span className="sr-only">Maximum price</span><input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={filters.max_price} onChange={e=>setFilters(f=>({...f,max_price:e.target.value}))}/></label></div></fieldset>
        <label className="listing-filter-field listing-sort-field"><span>Sort by</span><select aria-label="Sort listings" value={filters.ordering} onChange={e=>setFilters(f=>({...f,ordering:e.target.value}))}><option value="-created_at">Newest first</option><option value="created_at">Oldest first</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option></select></label>
      </section></aside><section className="browse-results-content"><div className="browse-category-pills"><Link className={!slug ? 'active' : ''} to="/listings">All listings</Link>{category && <Link className={!filters.subcategory ? 'active' : ''} to={`/category/${category.slug}`}>All in {category.name}</Link>}{category?.subcategories.map(s => <Link key={s.id} className={filters.subcategory === s.slug ? 'active' : ''} to={`/category/${category.slug}?subcategory=${encodeURIComponent(s.slug)}`}>{s.name}</Link>)}</div>{error ? <div className="public-error"><b>Could not load listings</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div> : loading ? <div className="listing-grid">{[1,2,3,4,5,6,7,8].map(n => <div className="listing-skeleton" key={n}><div/><span/><i/></div>)}</div> : ads.length ? <><div className="listing-grid">{ads.map(ad => <ListingCard key={ad.id} ad={ad}/>)}</div><div className="browse-pagination"><button disabled={!hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}><ArrowLeft size={14}/> Previous</button><span>Page {page}</span><button disabled={!hasNext} onClick={() => setPage(p => p + 1)}>Next <ArrowRight size={14}/></button></div></> : <div className="public-empty"><Store size={22}/><b>No listings found</b><span>Try a different search or browse another category.</span><Link to="/listings">Browse all listings <ArrowRight size={14}/></Link></div>}</section></div></main><footer className="public-footer"><div className="public-footer-bottom"><Link to="/">MarketDay Liberia</Link><span>Local finds. Liberian pride.</span></div></footer></div>
}
