import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Mail, MailCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { api } from '../lib/api'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await api.post('/auth/password-reset/', { email }); setSent(true) }
    catch (e) { setError(messageFromError(e, 'Please try again in a moment.')) }
    finally { setLoading(false) }
  }
  return (
    <AuthLayout title={sent ? 'Check your inbox' : 'Forgot your password?'} subtitle={sent ? 'If an account matches that email, we sent reset instructions.' : 'Enter the email address linked to your account.'}>
      {sent ? (
        <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><MailCheck className="size-7" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">For your security, we only send instructions when an account exists. Check your inbox and spam folder.</p>
          <Button asChild variant="cta" size="lg" className="w-full"><Link to="/login">Back to sign in<ArrowRight /></Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          {error && <Alert variant="error">{error}</Alert>}
          <FormField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail />} />
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Sending…</> : <>Send reset link<ArrowRight /></>}</Button>
          <Button asChild variant="ghost" className="justify-self-center text-muted-foreground"><Link to="/login"><ArrowLeft />Back to sign in</Link></Button>
        </form>
      )}
    </AuthLayout>
  )
}
