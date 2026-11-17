import { useState } from 'react'
import { Mail } from '../lib/site-icons'
import { useAuth } from '../lib/auth'
import { marketplaceApi } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import { Button } from '@/components/ui/button'

/** Shown to signed-in users whose email isn't verified yet; posting ads and messaging require it. */
export default function VerifyEmailNotice({ action = 'post ads and message sellers' }: { action?: string }) {
  const { profile } = useAuth()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [message, setMessage] = useState('')
  if (!profile || profile.email_verified || profile.is_staff) return null

  async function resend() {
    setState('sending'); setMessage('')
    try {
      await marketplaceApi.resendVerificationEmail()
      setState('sent'); setMessage(`We sent a new link to ${profile?.email}. Check your inbox and spam folder.`)
    } catch (error) {
      setState('idle'); setMessage(messageFromError(error, 'We could not send the email. Please try again later.'))
    }
  }

  return <div className="verify-email-notice" role="status">
    <span className="verify-email-icon" aria-hidden="true"><Mail size={18} /></span>
    <div>
      <b>Verify your email to {action}</b>
      <p>{message || `Open the link we sent to ${profile.email}.`}</p>
    </div>
    {state !== 'sent' && <div className="shrink-0 self-center max-[480px]:w-full"><Button type="button" variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => void resend()} disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Resend link'}</Button></div>}
  </div>
}
