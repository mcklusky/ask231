import { ArrowLeft, ArrowRight, Store, SlidersHorizontal } from '../lib/site-icons'
import { MapPin, Search as SearchGlyph } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ListingCard } from './Home'
import { liberianCounties, marketplaceApi, type Advertisement, type Category, type County } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import PublicHeader from '../components/PublicHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { COUNTRY_ADJECTIVE, COUNTRY_NAME, SITE_NAME } from '@/config/site'

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
  function renderFilterFields(prefix: string) {
    const set = (key: keyof typeof filters) => (value: string) => setFilters(f => ({ ...f, [key]: value }))
    const currencyOptions = [{ value: '', label: 'Any' }, { value: 'LRD', label: 'L$' }, { value: 'USD', label: 'US$' }]
    if (filters.currency && !currencyOptions.some(o => o.value === filters.currency)) currencyOptions.push({ value: filters.currency, label: filters.currency })
    return <div className="grid gap-4">
      <div className="grid gap-2"><Label htmlFor={`${prefix}-sort`}>Sort by</Label>
        <select id={`${prefix}-sort`} value={filters.ordering} onChange={e => set('ordering')(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
          <option value="-created_at">Newest first</option><option value="created_at">Oldest first</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option>
        </select>
      </div>
      <div className="grid gap-2"><span className="text-sm font-semibold">Condition</span>
        <Segmented label="Condition" value={filters.condition} onChange={set('condition')} options={[{ value: '', label: 'Any' }, { value: 'new', label: 'New' }, { value: 'used', label: 'Used' }]} />
      </div>
      <div className="grid gap-2"><span className="text-sm font-semibold">Currency</span>
        <Segmented label="Currency" value={filters.currency} onChange={set('currency')} options={currencyOptions} />
      </div>
      <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">Price range</legend>
        <div className="flex items-center gap-2">
          <Input aria-label="Minimum price" type="number" min="0" inputMode="numeric" placeholder="Min" value={filters.min_price} onChange={e => set('min_price')(e.target.value)} />
          <span className="text-muted-foreground" aria-hidden="true">–</span>
          <Input aria-label="Maximum price" type="number" min="0" inputMode="numeric" placeholder="Max" value={filters.max_price} onChange={e => set('max_price')(e.target.value)} />
        </div>
      </fieldset>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-town`}>Town or city</Label><Input id={`${prefix}-town`} placeholder="Any town or city" value={filters.town} onChange={e => set('town')(e.target.value)} /></div>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-country`}>Country</Label><Input id={`${prefix}-country`} placeholder="Any country" value={filters.country} onChange={e => set('country')(e.target.value)} /></div>
    </div>
  }
  return <div className="public-market browse-market"><PublicHeader /><main className="browse-main"><div className="browse-crumb"><Link to="/"><ArrowLeft size={14} /> Home</Link><span>/</span>{category ? <><Link to="/listings">Listings</Link><span>/</span><b>{category.name}</b></> : <b>All listings</b>}</div>
    <form className="marketplace-search browse-search" onSubmit={submitSearch}>
      <div className="listing-search-row">
        <label className="market-search-input"><input aria-label="Search products and services" placeholder="Search listings by name or keyword" value={searchInput} onChange={event => setSearchInput(event.target.value)} /></label>
        <button type="submit" aria-label="Search"><SearchGlyph size={19} aria-hidden="true"/></button>
      </div>
      <label className="browse-location-row"><MapPin size={16} aria-hidden="true"/><span>Location</span><select aria-label="Choose a county" value={countyInput} onChange={event => {setCountyInput(event.target.value);setFilters(f=>({...f,town:''}))}}><option value="">Any location</option>{counties.map(place => <option value={place.slug} key={place.id}>{place.name}</option>)}</select></label>

    </form>
    <div className="browse-heading"><div><span className="public-eyebrow">{SITE_NAME.toUpperCase()} · {COUNTRY_NAME.toUpperCase()}</span><h1>{query ? `Results for “${query}”` : category?.name || 'Explore local listings'}</h1><p>{activeCounty ? `Available in ${activeCounty.name}, ${COUNTRY_NAME}.` : category?.description || `Browse products from ${COUNTRY_NAME} and sellers abroad.`}</p></div><span className="browse-sort">{sortLabels[filters.ordering] || 'Newest first'}</span></div><div className="browse-content-layout"><aside className="browse-filter-sidebar max-[760px]:hidden" aria-label="Refine listings">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-display text-base font-bold"><SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />Filters{activeFilterCount > 0 && <Badge variant="red">{activeFilterCount}</Badge>}</p>
            {activeFilterCount > 0 && <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={clearFilters}>Clear all</Button>}
          </div>
          {renderFilterFields('desktop')}
        </Card>
      </aside>
      <div className="min-[761px]:hidden">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="w-full"><SlidersHorizontal />Filters &amp; sort{activeFilterCount > 0 && <Badge variant="red" className="ml-1">{activeFilterCount}</Badge>}</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-3 pb-0">
            <SheetHeader>
              <SheetTitle>Filters &amp; sort</SheetTitle>
              <SheetDescription>Results update as you choose.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-5 pb-2">{renderFilterFields('sheet')}</div>
            <SheetFooter>
              <Button type="button" variant="outline" className="flex-1" onClick={clearFilters} disabled={activeFilterCount === 0}>Clear all</Button>
              <SheetClose asChild><Button type="button" className="flex-1">Show results</Button></SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div><section className="browse-results-content"><div className="browse-category-pills"><Link className={!slug ? 'active' : ''} to="/listings">All listings</Link>{category && <Link className={!filters.subcategory ? 'active' : ''} to={`/category/${category.slug}`}>All in {category.name}</Link>}{category?.subcategories.map(s => <Link key={s.id} className={filters.subcategory === s.slug ? 'active' : ''} to={`/category/${category.slug}?subcategory=${encodeURIComponent(s.slug)}`}>{s.name}</Link>)}</div>{error ? <div className="public-error"><b>Could not load listings</b><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div> : loading ? <div className="listing-grid">{[1,2,3,4,5,6,7,8].map(n => <div className="listing-skeleton" key={n}><div/><span/><i/></div>)}</div> : ads.length ? <><div className="listing-grid">{ads.map(ad => <ListingCard key={ad.id} ad={ad}/>)}</div><div className="browse-pagination"><button disabled={!hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}><ArrowLeft size={14}/> Previous</button><span>Page {page}</span><button disabled={!hasNext} onClick={() => setPage(p => p + 1)}>Next <ArrowRight size={14}/></button></div></> : <div className="public-empty"><Store size={22}/><b>No listings found</b><span>Try a different search or browse another category.</span><Link to="/listings">Browse all listings <ArrowRight size={14}/></Link></div>}</section></div></main><footer className="public-footer"><div className="public-footer-bottom"><Link to="/">{SITE_NAME}</Link><span>Local finds. {COUNTRY_ADJECTIVE} pride.</span></div></footer></div>
}
