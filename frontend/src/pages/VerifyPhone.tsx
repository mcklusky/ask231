import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Loader2, MessageSquareText, Smartphone } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PhoneNumberField from '../components/PhoneNumberField'
import { formatPhone, phoneApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

const RESEND_SECONDS = 60

/** Enter the 6-digit code we texted. Also used to add or change the member's phone number. */
export default function VerifyPhone() {
  const { profile, ready, setProfile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const justSent = params.get('sent') === '1'
  const next = params.get('next')
  const [target, setTarget] = useState('')
  const [changing, setChanging] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'verify' | 'send' | null>(null)
  const [wait, setWait] = useState(justSent ? RESEND_SECONDS : 0)

  useEffect(() => { if (profile && !target) setTarget(profile.login_phone) }, [profile, target])
  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait(seconds => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  if (!ready) return null
  if (!profile) return <Navigate to="/login?next=/verify-phone" replace />
  const hasCode = justSent || wait > 0 || (target && target !== profile.login_phone)
  const done = profile.phone_verified && target === profile.login_phone && !changing

  async function send(number?: string) {
    setError(''); setBusy('send')
    try {
      const { data } = await phoneApi.sendCode(number)
      if (data.phone) setTarget(data.phone)
      setChanging(false); setCode(''); setWait(RESEND_SECONDS)
      toast.success(data.detail)
    } catch (e) { setError(messageFromError(e, 'We could not send a code. Please try again.')) }
    finally { setBusy(null) }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy('verify')
    try {
      const { data } = await phoneApi.verify(code)
      setProfile(data)
      toast.success('Phone number verified')
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/account')
    } catch (e) { setError(messageFromError(e, 'That code did not work. Please try again.')) }
    finally { setBusy(null) }
  }

  if (done) return (
    <AuthLayout title="Phone verified" subtitle={`${formatPhone(profile.login_phone)} is confirmed.`}>
      <div className="grid gap-3">
        <Button asChild variant="cta" size="lg" className="w-full"><Link to="/account">Back to my account<ArrowRight /></Link></Button>
        <Button variant="outline" onClick={() => { setChanging(true); setNewNumber('') }}>Change my number</Button>
      </div>
    </AuthLayout>
  )

  if (changing || !target) return (
    <AuthLayout title={target ? 'Change your number' : 'Add your phone number'} subtitle="We will text you a code to confirm it. Standard text rates may apply.">
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void send(newNumber) }}>
        {error && <Alert variant="error">{error}</Alert>}
        <PhoneNumberField label="Phone number" name="phone_number" placeholder="770 123 456" value={newNumber} onChange={setNewNumber} required />
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={busy === 'send' || !newNumber.trim()}>{busy === 'send' ? <><Loader2 className="animate-spin" />Sending…</> : <>Text me a code<MessageSquareText /></>}</Button>
        {target && <Button type="button" variant="ghost" onClick={() => setChanging(false)}>Cancel</Button>}
      </form>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Enter your code" subtitle={hasCode ? `We texted a 6-digit code to ${formatPhone(target)}.` : `We will text a 6-digit code to ${formatPhone(target)}.`}>
      <form className="grid gap-4" onSubmit={verify}>
        {error && <Alert variant="error">{error}</Alert>}
        {!hasCode && <Button type="button" variant="cta" size="lg" className="w-full" disabled={busy === 'send'} onClick={() => void send()}>{busy === 'send' ? <><Loader2 className="animate-spin" />Sending…</> : <>Text me a code<MessageSquareText /></>}</Button>}
        <div className="grid gap-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="123456" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 text-center font-display text-2xl font-bold tracking-[0.4em]" autoFocus={Boolean(hasCode)} />
        </div>
        <Button type="submit" variant={hasCode ? 'cta' : 'default'} size="lg" className="w-full" disabled={busy === 'verify' || code.length !== 6}>{busy === 'verify' ? <><Loader2 className="animate-spin" />Checking…</> : <>Verify<ArrowRight /></>}</Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {hasCode && <Button type="button" variant="link" className="h-auto p-0" disabled={wait > 0 || busy === 'send'} onClick={() => void send(target !== profile.login_phone ? target : undefined)}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</Button>}
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => { setChanging(true); setNewNumber('') }}><Smartphone />Use a different number</Button>
        </div>
        <p className="text-xs text-muted-foreground">Didn&apos;t get it? Texts can take a minute on busy networks. Check the number is right, then resend.</p>
      </form>
    </AuthLayout>
  )
}
