import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { requestsApi, type BuyerRequest } from '@/lib/requests'
import RequestCard from '@/components/RequestCard'
import { Button } from '@/components/ui/button'

/** Home page: the latest "looking for" requests, or an invitation to post the first one. */
export default function HomeRequests() {
  const { profile } = useAuth()
  const [items, setItems] = useState<BuyerRequest[] | null>(null)
  useEffect(() => {
    let alive = true
    requestsApi.list().then(({ data }) => { if (alive) setItems(data.results.slice(0, 4)) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [])
  const postTo = profile ? '/requests/new' : '/login?next=/requests/new'
  return (
    <section className="market-home-section">
      <div className="market-home-section-heading">
        <div><span className="public-eyebrow">WANTED</span><h2>People are looking for</h2></div>
        <Link to="/requests">View all <ArrowRight size={15} /></Link>
      </div>
      {items && items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">{items.map(item => <li key={item.id} className="grid"><RequestCard request={item} /></li>)}</ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-5 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary dark:text-brand-primary"><Search className="size-5" aria-hidden="true" /></span>
          <div className="flex-1">
            <b className="font-display">Can&apos;t find what you need?</b>
            <p className="text-sm text-muted-foreground">Post a request, like &ldquo;generator in Paynesville&rdquo; or &ldquo;tailor in Gbarnga&rdquo;, and let sellers come to you.</p>
          </div>
          <Button asChild variant="cta" className="shrink-0"><Link to={postTo}><Plus />Post a request</Link></Button>
        </div>
      )}
    </section>
  )
}
