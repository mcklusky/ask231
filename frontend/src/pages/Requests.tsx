import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Plus, Search } from 'lucide-react'
import MarketLayout from '../components/MarketLayout'
import RequestCard from '../components/RequestCard'
import { useAuth } from '../lib/auth'
import { marketplaceApi, type Category, type County } from '../lib/marketplace'
import { requestsApi, type BuyerRequest } from '../lib/requests'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'

/** Browse what people are looking for, or manage your own requests. */
export default function Requests() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'mine' && profile ? 'mine' : 'all'
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const county = params.get('county') || ''
  const [query, setQuery] = useState(q)
  const [items, setItems] = useState<BuyerRequest[]>([])
  const [mine, setMine] = useState<BuyerRequest[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [counties, setCounties] = useState<County[]>([])

  useEffect(() => {
    marketplaceApi.categories().then(({ data }) => setCategories(data.results)).catch(() => undefined)
    marketplaceApi.counties().then(({ data }) => setCounties(data.results)).catch(() => undefined)
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    const load = tab === 'mine'
      ? requestsApi.mine().then(({ data }) => { if (alive) setMine(data) })
      : requestsApi.list({ page, q, category, county }).then(({ data }) => { if (alive) { setItems(current => page === 1 ? data.results : [...current, ...data.results]); setHasMore(Boolean(data.next)) } })
    load.catch(e => { if (alive) setError(messageFromError(e, 'We could not load requests.')) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tab, page, q, category, county])

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setPage(1); setParams(next, { replace: true })
  }
  function search(event: FormEvent) { event.preventDefault(); setFilter('q', query.trim()) }

  async function toggle(request: BuyerRequest) {
    const status = request.status === 'open' ? 'closed' : 'open'
    try {
      const { data } = await requestsApi.setStatus(request.id, status)
      setMine(current => current.map(item => item.id === data.id ? data : item))
      toast.success(status === 'closed' ? 'Request closed' : 'Request reopened')
    } catch (e) { toast.error(messageFromError(e, 'Could not update the request.')) }
  }

  const postTo = profile ? '/requests/new' : '/login?next=/requests/new'
  return (
    <MarketLayout eyebrow="Wanted" title="People are looking for" subtitle="Can you sell it or do the job? Send them a message. Can't find what you need? Post a request and let sellers come to you.">
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {profile && <Segmented className="sm:w-72" label="Show" value={tab} onChange={value => { const next = new URLSearchParams(params); if (value === 'mine') next.set('tab', 'mine'); else next.delete('tab'); setParams(next) }} options={[{ value: 'all', label: 'All requests' }, { value: 'mine', label: 'My requests' }]} />}
          <Button asChild variant="cta" className="sm:ml-auto"><Link to={postTo}><Plus />Post a request</Link></Button>
        </div>

        {tab === 'all' && (
          <Card className="grid gap-3 p-3 sm:grid-cols-[1fr_12rem_12rem]">
            <form onSubmit={search} className="flex gap-2">
              <label className="sr-only" htmlFor="request-search">Search requests</label>
              <Input id="request-search" placeholder="Search: generator, plumber, land…" value={query} onChange={event => setQuery(event.target.value)} />
              <Button type="submit" size="icon" aria-label="Search"><Search /></Button>
            </form>
            <Combobox id="request-category" options={[{ value: '', label: 'All categories' }, ...categories.map(item => ({ value: item.slug, label: item.name }))]} value={category} onChange={value => setFilter('category', value)} placeholder="All categories" searchPlaceholder="Search categories…" />
            <Combobox id="request-county" options={[{ value: '', label: 'All counties' }, ...counties.map(item => ({ value: item.slug, label: item.name }))]} value={county} onChange={value => setFilter('county', value)} placeholder="All counties" searchPlaceholder="Search counties…" />
          </Card>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {(() => {
          const list = tab === 'mine' ? mine : items
          if (loading && (tab === 'mine' || page === 1)) return <div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-primary" aria-label="Loading requests" /></div>
          if (!list.length) return (
            <Card className="grid justify-items-center gap-2 p-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Search className="size-6" aria-hidden="true" /></span>
              <b>{tab === 'mine' ? 'You have not posted a request yet' : q || category || county ? 'No requests match your search' : 'No requests yet'}</b>
              <p className="max-w-sm text-sm text-muted-foreground">Tell sellers what you need, for example &ldquo;5kVA generator in Paynesville&rdquo; or &ldquo;electrician for a house in Gbarnga&rdquo;.</p>
              <Button asChild variant="cta" size="sm"><Link to={postTo}><Plus />Post a request</Link></Button>
            </Card>
          )
          return (
            <ul className="grid gap-3">
              {list.map(request => (
                <li key={request.id} className="grid gap-2">
                  <RequestCard request={request} />
                  {tab === 'mine' && (
                    <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
                      <span className="text-muted-foreground">{request.responses_count ? `${request.responses_count} ${request.responses_count === 1 ? 'person has' : 'people have'} replied. See Messages.` : 'No replies yet.'}</span>
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => void toggle(request)}>{request.status === 'open' ? 'Mark as found / close' : 'Reopen'}</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        })()}
        {tab === 'all' && hasMore && <Button variant="outline" className="justify-self-center" disabled={loading} onClick={() => setPage(value => value + 1)}>{loading ? <><Loader2 className="animate-spin" />Loading…</> : 'Show more'}</Button>}
      </div>
    </MarketLayout>
  )
}
