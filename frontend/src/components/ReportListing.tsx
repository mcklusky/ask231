import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Flag } from '../lib/site-icons'
import { useAuth } from '../lib/auth'
import { marketplaceApi, reportReasons, type ReportReason } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'

export default function ReportListing({ slug }: { slug: string }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('scam')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function toggle() {
    if (!profile) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return }
    setOpen(value => !value); setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true); setError('')
    try { await marketplaceApi.report(slug, reason, details.trim()); setDone(true); setOpen(false) }
    catch (e) { setError(messageFromError(e, 'Your report could not be sent. Please try again.')) }
    finally { setSending(false) }
  }

  if (done) return <p className="report-listing-done" role="status">Thank you. Our team will review this listing.</p>
  return <div className="report-listing">
    <button type="button" className="report-listing-toggle" onClick={toggle} aria-expanded={open} aria-controls="report-listing-form"><Flag size={14} /> {open ? 'Cancel report' : 'Report this listing'}</button>
    {open && <form id="report-listing-form" className="report-listing-form" onSubmit={submit}>
      <label htmlFor="report-reason">What's wrong with this listing?</label>
      <select id="report-reason" value={reason} onChange={event => setReason(event.target.value as ReportReason)}>{reportReasons.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <label htmlFor="report-details">Details <span>(optional)</span></label>
      <textarea id="report-details" rows={3} maxLength={2000} placeholder="Tell us what happened, e.g. the seller asked for payment before meeting." value={details} onChange={event => setDetails(event.target.value)} />
      {error && <div className="chat-error report-listing-error" role="alert">{error}</div>}
      <button type="submit" disabled={sending}>{sending ? 'Sending report…' : 'Send report'}</button>
    </form>}
  </div>
}
