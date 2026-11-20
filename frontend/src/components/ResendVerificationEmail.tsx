import { useState, type FormEvent } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import FormField from './FormField'
import { emailVerificationApi } from '../lib/api'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * "Send me a new link" for people who aren't signed in (sign-up, sign-in and expired-link pages).
 * The server answers the same way whether or not the address has an account.
 */
export default function ResendVerificationEmail({ email: knownEmail = '', askForEmail = false }: { email?: string; askForEmail?: boolean }) {
  const [email, setEmail] = useState(knownEmail)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const showField = askForEmail || !knownEmail

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!email.trim()) { setError('Enter the email address you signed up with.'); return }
    setState('sending')
    try {
      const { data } = await emailVerificationApi.resend(email.trim())
      setMessage(data.detail); setState('sent')
    } catch (e) {
      setError(messageFromError(e, 'We could not send the email. Please try again in a few minutes.')); setState('idle')
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 text-left" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {showField && <FormField label="Email address" name="resend_email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail />} />}
      <Button type="submit" variant="outline" size="lg" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" disabled={state === 'sending'}>
        {state === 'sending' ? <><Loader2 className="animate-spin" />Sending…</> : <><Send />{state === 'sent' ? 'Send another link' : 'Resend verification email'}</>}
      </Button>
    </form>
  )
}
