import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Mail, MailCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import PhoneNumberField from '../components/PhoneNumberField'
import { api, phoneApi } from '../lib/api'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'

export default function ForgotPassword() {
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState('')
  const [code, setCode] = useState(''); const [password, setPassword] = useState('')
  const [error, setError] = useState(''); const [step, setStep] = useState<'ask' | 'code' | 'email-sent'>('ask'); const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function request(event?: FormEvent) {
    event?.preventDefault(); setError(''); setLoading(true)
    try {
      if (method === 'phone') { await phoneApi.requestReset(phone); setStep('code') }
      else { await api.post('/auth/password-reset/', { email }); setStep('email-sent') }
    } catch (e) { setError(messageFromError(e, 'Please try again in a moment.')) }
    finally { setLoading(false) }
  }

  async function reset(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      await phoneApi.confirmReset(phone, code, password)
      toast.success('Password updated', { description: 'Sign in with your phone number and new password.' })
      navigate('/login')
    } catch (e) { setError(messageFromError(e, 'That did not work. Check the code and try again.')) }
    finally { setLoading(false) }
  }

  if (step === 'email-sent') return (
    <AuthLayout title="Check your inbox" subtitle="If an account matches that email, we sent reset instructions.">
      <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><MailCheck className="size-7" aria-hidden="true" /></span>
        <p className="text-sm text-muted-foreground">For your security, we only send instructions when an account exists. Check your inbox and spam folder.</p>
        <Button asChild variant="cta" size="lg" className="w-full"><Link to="/login">Back to sign in<ArrowRight /></Link></Button>
      </div>
    </AuthLayout>
  )

  if (step === 'code') return (
    <AuthLayout title="Enter your code" subtitle="If an account uses that number, we texted it a 6-digit code.">
      <form onSubmit={reset} className="grid gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid gap-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 text-center font-display text-2xl font-bold tracking-[0.4em]" autoFocus />
        </div>
        <FormField label="New password" name="new_password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required hint="Use 8 or more characters." />
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading || code.length !== 6 || password.length < 8}>{loading ? <><Loader2 className="animate-spin" />Saving…</> : <>Set new password<ArrowRight /></>}</Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Button type="button" variant="link" className="h-auto p-0" disabled={loading} onClick={() => void request()}>Send a new code</Button>
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => { setStep('ask'); setCode('') }}>Use a different number</Button>
        </div>
      </form>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Forgot your password?" subtitle="We will help you set a new one.">
      <form onSubmit={request} className="grid gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Segmented label="Reset with" value={method} onChange={value => { setMethod(value as 'phone' | 'email'); setError('') }} options={[{ value: 'phone', label: 'Phone number' }, { value: 'email', label: 'Email' }]} />
        {method === 'phone'
          ? <PhoneNumberField label="Phone number" name="phone_number" placeholder="770 123 456" value={phone} onChange={setPhone} required hint="The number you sign in with. We will text you a code." />
          : <FormField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail />} />}
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Sending…</> : <>{method === 'phone' ? 'Text me a code' : 'Send reset link'}<ArrowRight /></>}</Button>
        <Button asChild variant="ghost" className="justify-self-center text-muted-foreground"><Link to="/login"><ArrowLeft />Back to sign in</Link></Button>
      </form>
    </AuthLayout>
  )
}
