import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Mail, MailCheck, Store, UserRound } from 'lucide-react'
import ResendVerificationEmail from '../components/ResendVerificationEmail'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import PhoneNumberField from '../components/PhoneNumberField'
import { api } from '../lib/api'
import { messageFromError } from '../utils/errors'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { COUNTRY_NAME, SITE_NAME } from '@/config/site'

export default function Register() {
  const [values, setValues] = useState({ first_name: '', last_name: '', email: '', phone_number: '', password: '', seller_name: '' })
  const [seller, setSeller] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const navigate = useNavigate()
  const [done, setDone] = useState<null | { email: string; sent: boolean }>(null)
  function update(field: keyof typeof values, value: string) { setValues(current => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const body = { ...values, email: values.email.trim(), seller_name: seller ? values.seller_name : '' }
    if (!body.email) { setError('Enter your email address.'); setLoading(false); return }
    try {
      // New accounts must confirm their email before they can sign in, so show "check your inbox".
      const { data } = await api.post<{ email: string; email_sent: boolean }>('/auth/register/', body)
      setDone({ email: data.email || body.email, sent: data.email_sent !== false })
      window.scrollTo({ top: 0 })
    }
    catch (e) { setError(messageFromError(e, 'We could not create your account. Please check your details.')) }
    finally { setLoading(false) }
  }
  if (done) return (
    <AuthLayout title="Check your inbox" subtitle="One quick step to activate your account.">
      <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><MailCheck className="size-7" aria-hidden="true" /></span>
        <h2 className="font-display text-xl font-bold">Verify your email to finish</h2>
        {done.sent
          ? <p className="text-sm text-muted-foreground">We sent a verification link to <b className="break-all text-foreground">{done.email}</b>. Open it to activate your account, then sign in. The link works for 24 hours.</p>
          : <Alert variant="error">Your account was created, but we couldn't send the verification email just now. Use the button below to try again.</Alert>}
        <p className="text-xs text-muted-foreground">Can't find it? Check your spam or promotions folder, or send a new link.</p>
        <ResendVerificationEmail email={done.email} />
        <Button variant="cta" size="lg" className="w-full" onClick={() => navigate('/login')}>I've verified, sign in<ArrowRight /></Button>
      </div>
    </AuthLayout>
  )
  return (
    <AuthLayout title="Create your account" subtitle={`Join the marketplace made for ${COUNTRY_NAME}.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" name="first_name" autoComplete="given-name" placeholder="Amara" value={values.first_name} onChange={e => update('first_name', e.target.value)} required icon={<UserRound />} />
          <FormField label="Last name" name="last_name" autoComplete="family-name" placeholder="Johnson" value={values.last_name} onChange={e => update('last_name', e.target.value)} required />
        </div>
        <FormField label="Email address" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={values.email} onChange={e => update('email', e.target.value)} required icon={<Mail />} hint="We will email you a link to confirm it before you sign in." />
        <PhoneNumberField label="Phone number (optional)" name="phone_number" placeholder="770 123 456" value={values.phone_number} onChange={value => update('phone_number', value)} hint="Add it so buyers can reach you and you can sign in with your phone too." />
        <FormField label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={values.password} onChange={e => update('password', e.target.value)} required hint="Use 8 or more characters." />
        <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring', seller ? 'border-primary bg-secondary' : 'hover:border-primary/50')}>
          <input type="checkbox" checked={seller} onChange={e => setSeller(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--ui-primary))]" />
          <span className="flex-1"><b className="flex items-center gap-1.5 text-sm"><Store className="size-4 text-primary" aria-hidden="true" />I want to sell on {SITE_NAME}</b><span className="mt-0.5 block text-xs text-muted-foreground">Buy and sell with the same account.</span></span>
        </label>
        {seller && <FormField label="Shop or business name" name="seller_name" placeholder="Your business name" value={values.seller_name} onChange={e => update('seller_name', e.target.value)} required />}
        <Button type="submit" variant="cta" size="lg" className="mt-1 w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Creating account…</> : <>Create account<ArrowRight /></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline dark:text-brand-primary">Sign in</Link></p>
    </AuthLayout>
  )
}
