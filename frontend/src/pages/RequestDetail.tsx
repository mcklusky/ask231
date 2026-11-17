import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Loader2, MapPin, MessageCircle, Send, ShieldCheck, Smartphone, Tag } from 'lucide-react'
import MarketLayout from '../components/MarketLayout'
import VerifyEmailNotice from '../components/VerifyEmailNotice'
import { useAuth } from '../lib/auth'
import { formatBudget, requestsApi, timeAgo, type BuyerRequest } from '../lib/requests'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label, Textarea } from '@/components/ui/input'

/** One request, with a box for sellers to reply. */
export default function RequestDetail() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [request, setRequest] = useState<BuyerRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    requestsApi.get(Number(id)).then(({ data }) => { if (alive) setRequest(data) })
      .catch(e => { if (alive) setError(messageFromError(e, 'This request is no longer available.')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    setSending(true); setError('')
    try {
      const { data } = await requestsApi.respond(Number(id), reply)
      navigate(`/messages/${data.id}`)
    } catch (e) { setError(messageFromError(e, 'We could not send your message.')) }
    finally { setSending(false) }
  }

  if (loading) return <MarketLayout eyebrow="Wanted" title="Request" subtitle="Loading…"><div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" /></div></MarketLayout>
  if (!request) return (
    <MarketLayout eyebrow="Wanted" title="Request not found" subtitle={error || 'It may have been closed or removed.'}>
      <Button asChild variant="outline"><Link to="/requests"><ArrowLeft />See other requests</Link></Button>
    </MarketLayout>
  )

  return (
    <MarketLayout eyebrow="Looking for" title={request.title} subtitle={`Posted by ${request.requester_name} · ${timeAgo(request.created_at)}`}>
      <Button asChild variant="ghost" className="-ml-3 mb-3 text-muted-foreground"><Link to="/requests"><ArrowLeft />All requests</Link></Button>
      <div className="grid gap-4">
        <Card className="grid gap-3 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default"><Tag aria-hidden="true" />{formatBudget(request)}</Badge>
            <Badge variant="outline"><MapPin aria-hidden="true" />{request.location}</Badge>
            {request.category && <Badge variant="outline">{request.category.name}</Badge>}
            {request.requester_phone_verified && <Badge variant="success"><Smartphone aria-hidden="true" />Phone verified</Badge>}
            {request.status === 'closed' && <Badge variant="warning">Closed: they found what they needed</Badge>}
          </div>
          {request.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{request.description}</p> : <p className="text-sm text-muted-foreground">No extra details.</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden="true" />Open until {new Date(request.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
        </Card>

        {request.is_mine ? (
          <Card className="grid gap-2 p-5">
            <b>This is your request</b>
            <p className="text-sm text-muted-foreground">{request.responses_count ? `${request.responses_count} ${request.responses_count === 1 ? 'person has' : 'people have'} replied.` : 'No replies yet. We will text or email you when someone replies.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="default"><Link to="/messages"><MessageCircle />Open messages</Link></Button>
              <Button asChild variant="outline"><Link to="/requests?tab=mine">Manage my requests</Link></Button>
            </div>
          </Card>
        ) : request.status === 'open' ? (
          <Card className="p-5">
            <form className="grid gap-3" onSubmit={send}>
              <Label htmlFor="reply" className="text-base font-bold">Can you help? Send {request.requester_name.split(' ')[0]} a message</Label>
              {profile && <VerifyEmailNotice action="reply to requests" />}
              {error && <Alert variant="error">{error}</Alert>}
              <Textarea id="reply" rows={4} maxLength={4000} placeholder="Say what you can offer, your price, and when or where they can see it." value={reply} onChange={event => setReply(event.target.value)} />
              <Button type="submit" variant="cta" disabled={sending || (Boolean(profile) && !reply.trim())}>{sending ? <><Loader2 className="animate-spin" />Sending…</> : profile ? <>Send message<Send /></> : 'Sign in to reply'}</Button>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Never ask for or send money before the buyer has seen the item.</p>
            </form>
          </Card>
        ) : null}
      </div>
    </MarketLayout>
  )
}
