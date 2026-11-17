import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { marketplaceApi, reportReasons, type ReportReason } from '@/lib/marketplace'
import { messageFromError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type Props = {
  slug: string
  /** Replace the real API call (demo listings). */
  onSubmit?: (reason: ReportReason, details: string) => Promise<void> | void
  /** Demo listings can be "reported" without signing in. */
  requireSignIn?: boolean
}

/** "Report this listing" — opens a dialog where buyers flag scams and other problems for the staff team. */
export default function ReportDialog({ slug, onSubmit, requireSignIn = true }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('scam')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  function openChange(next: boolean) {
    if (next && requireSignIn && !profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    setOpen(next); setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true); setError('')
    try {
      if (onSubmit) await onSubmit(reason, details.trim())
      else { await marketplaceApi.report(slug, reason, details.trim()); toast.success('Report sent', { description: 'Thank you. Our team will review this listing.' }) }
      setOpen(false); setDetails(''); setReason('scam')
    } catch (e) {
      setError(messageFromError(e, 'Your report could not be sent. Please try again.'))
    } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-brand-red"><Flag />Report this listing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>Tell us what’s wrong. Reports are private — the seller won’t see who sent them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">What’s the problem?</legend>
            {reportReasons.map(item => (
              <label key={item.value} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-medium transition-colors hover:border-primary/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring', reason === item.value ? 'border-primary bg-secondary text-foreground' : 'border-border')}>
                <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} className="size-4 accent-[hsl(var(--ui-primary))]" />
                {item.label}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-2">
            <Label htmlFor="report-details">Details <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="report-details" rows={3} maxLength={2000} placeholder="For example: the seller asked for mobile money before meeting." value={details} onChange={event => setDetails(event.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-md border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="cta" disabled={sending}><Flag />{sending ? 'Sending…' : 'Send report'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
