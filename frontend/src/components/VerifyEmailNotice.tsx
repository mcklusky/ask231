import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail } from '../lib/site-icons'
import { formatPhone } from '../lib/api'
import { useAuth } from '../lib/auth'
import { marketplaceApi } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import { Button } from '@/components/ui/button'

/** Shown to signed-in members who haven't confirmed a phone or email yet; posting ads and messaging need one. */
export default function VerifyEmailNotice({ action = 'post ads and message sellers' }: { action?: string }) {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [message, setMessage] = useState('')
  if (!profile || profile.email_verified || profile.phone_verified || profile.is_staff) return null

  async function resend() {
    setState('sending'); setMessage('')
    try {
      await marketplaceApi.resendVerificationEmail()
      setState('sent'); setMessage(`We sent a new link to ${profile?.email}. Check your inbox and spam folder.`)
    } catch (error) {
      setState('idle'); setMessage(messageFromError(error, 'We could not send the email. Please try again later.'))
    }
  }

  const usePhone = Boolean(profile.login_phone) || !profile.email
  const hint = usePhone
    ? profile.login_phone ? `Enter the code we texted to ${formatPhone(profile.login_phone)}.` : 'Add your phone number and we will text you a code.'
    : `Open the link we sent to ${profile.email}.`

  return <div className="verify-email-notice" role="status">
    <span className="verify-email-icon" aria-hidden="true"><Mail size={18} /></span>
    <div>
      <b>Verify your {usePhone ? 'phone' : 'email'} to {action}</b>
      <p>{message || hint}</p>
    </div>
    <div className="flex shrink-0 flex-wrap gap-2 self-center max-[480px]:w-full">
      {usePhone && <Button asChild variant="default" className="max-[480px]:flex-1"><Link to={`/verify-phone?next=${encodeURIComponent(pathname)}`}>Enter code</Link></Button>}
      {profile.email && state !== 'sent' && <Button type="button" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground max-[480px]:flex-1" onClick={() => void resend()} disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Resend email link'}</Button>}
    </div>
  </div>
}
