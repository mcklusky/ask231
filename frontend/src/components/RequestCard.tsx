import { Link } from 'react-router-dom'
import { Clock, MapPin, Search, Smartphone } from 'lucide-react'
import { type BuyerRequest, formatBudget, timeAgo } from '@/lib/requests'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

/** One "looking for" request in a list. */
export default function RequestCard({ request }: { request: BuyerRequest }) {
  return (
    <Card className="relative p-4 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary dark:text-brand-blue"><Search className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-red">Looking for{request.category ? ` · ${request.category.name}` : ''}</p>
          <h3 className="mt-0.5 font-display text-base font-bold leading-snug">
            <Link to={`/requests/${request.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{request.title}</Link>
          </h3>
          {request.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formatBudget(request)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{request.location}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{timeAgo(request.created_at)}</span>
            {request.requester_phone_verified && <Badge variant="success" className="px-1.5 py-0 text-[10px]"><Smartphone aria-hidden="true" />Phone verified</Badge>}
            {request.status === 'closed' && <Badge variant="warning" className="px-1.5 py-0 text-[10px]">Closed</Badge>}
          </div>
        </div>
      </div>
    </Card>
  )
}
