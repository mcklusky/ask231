import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeCheck, Bell, Heart, MessageSquareText, Smartphone, LayoutDashboard, List, Loader2, LogOut, MessageCircle, Plus, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import PhoneNumberField from '../components/PhoneNumberField'
import VerifyEmailNotice from '../components/VerifyEmailNotice'
import { accountLabel, api, formatPhone, type Profile } from '../lib/api'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { LOCAL_CURRENCY, LOCAL_CURRENCY_NAME, LOCAL_CURRENCY_SYMBOL, SITE_NAME } from '@/config/site'

const counties = ['Bomi', 'Bong', 'Gbarpolu', 'Grand Bassa', 'Grand Cape Mount', 'Grand Gedeh', 'Grand Kru', 'Lofa', 'Margibi', 'Maryland', 'Montserrado', 'Nimba', 'River Cess', 'River Gee', 'Sinoe']
const countyOptions = counties.map(name => ({ value: name, label: name }))

export default function Account() {
  const { profile, setProfile, logout } = useAuth()
  const [form, setForm] = useState<Profile | null>(profile)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAlerts, setSavingAlerts] = useState<'email' | 'sms' | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<Profile>('/auth/profile/')
      .then(({ data }) => { setProfile(data); setForm(data) })
      .catch(e => setError(messageFromError(e, 'Please sign in again.')))
      .finally(() => setLoading(false))
  }, [setProfile])

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm(current => current ? { ...current, [key]: value } : current)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setError(''); setSaving(true)
    try {
      const { data } = await api.patch<Profile>('/auth/profile/', { first_name: form.first_name, last_name: form.last_name, phone_number: form.phone_number, county: form.county, town: form.town, preferred_currency: form.preferred_currency })
      setForm(data); setProfile(data); toast.success('Profile saved')
    } catch (e) { setError(messageFromError(e, 'We could not save those changes.')) }
    finally { setSaving(false) }
  }

  async function setAlert(field: 'email_on_new_message' | 'sms_on_new_message', enabled: boolean) {
    const kind = field === 'email_on_new_message' ? 'email' : 'sms'
    setSavingAlerts(kind)
    update(field, enabled)
    try {
      const { data } = await api.patch<Profile>('/auth/profile/', { [field]: enabled })
      setProfile(data); setForm(current => current ? { ...current, [field]: data[field] } : current)
      toast.success(`Message ${kind === 'email' ? 'emails' : 'texts'} turned ${enabled ? 'on' : 'off'}`)
    } catch (e) {
      update(field, !enabled)
      toast.error(messageFromError(e, 'We could not change that setting.'))
    } finally { setSavingAlerts(null) }
  }

  async function signOut() { await logout(); navigate('/login') }
  async function requestVerification() {
    setError('')
    try {
      await api.post('/auth/seller/verification-request/')
      const { data } = await api.get<Profile>('/auth/profile/'); setProfile(data); setForm(data)
      toast.success('Verification requested', { description: 'Our team will review your seller profile.' })
    } catch (e) { setError(messageFromError(e, 'Could not submit your request.')) }
  }

  if (loading) return <AuthLayout title="Your account" subtitle="Loading your profile." wide><div className="grid h-40 place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div></AuthLayout>
  if (!form) return <AuthLayout title="Sign in required" subtitle={error || 'Sign in to manage your profile.'}><Button asChild variant="cta" size="lg" className="w-full"><Link to="/login">Go to sign in</Link></Button></AuthLayout>

  const name = [form.first_name, form.last_name].filter(Boolean).join(' ') || 'Your profile'
  const initials = (`${form.first_name?.[0] ?? ''}${form.last_name?.[0] ?? ''}` || accountLabel(form)[0] || '?').toUpperCase()
  const sellerVerified = Boolean(form.seller_profile?.is_verified)
  const requested = Boolean(form.seller_profile?.verification_requested)

  return (
    <AuthLayout title="Your account" subtitle="Manage your details, ads and messages." wide>
      <div className="grid grid-cols-1 gap-4">
        <Card className="flex items-center gap-4 p-4">
          <Avatar className="size-14"><AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{[form.email, form.login_phone && formatPhone(form.login_phone)].filter(Boolean).join(' · ') || `${SITE_NAME} member`}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {form.phone_verified && <Badge variant="success"><Smartphone aria-hidden="true" />Phone verified</Badge>}
              {form.email && (form.email_verified ? <Badge variant="success"><BadgeCheck aria-hidden="true" />Email verified</Badge> : <Badge variant="warning">Email not verified</Badge>)}
              {form.login_phone && !form.phone_verified && <Badge variant="warning">Phone not verified</Badge>}
              {sellerVerified && <Badge><ShieldCheck aria-hidden="true" />Verified seller</Badge>}
              {profile?.is_staff && <Badge variant="accent">Staff</Badge>}
            </div>
          </div>
        </Card>

        <nav aria-label="Account shortcuts" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { to: '/my-ads', icon: List, label: 'My ads' },
            { to: '/favorites', icon: Heart, label: 'Saved' },
            { to: '/messages', icon: MessageCircle, label: 'Messages' },
          ].map(({ to, icon: Icon, label }) => (
            <Button key={to} asChild variant="outline" className="h-auto flex-col gap-1.5 py-3"><Link to={to}><Icon className="!size-5 text-primary" />{label}</Link></Button>
          ))}
          <Button asChild variant="cta" className="h-auto flex-col gap-1.5 py-3"><Link to="/ads/new"><Plus className="!size-5" />Post an ad</Link></Button>
          {profile?.is_staff && <Button asChild variant="secondary" className="col-span-2 sm:col-span-4"><Link to="/admin"><LayoutDashboard />Staff dashboard</Link></Button>}
        </nav>

        <VerifyEmailNotice />

        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />Seller verification</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Verified sellers get a badge on every listing. Our team reviews each request.</p>
          </div>
          {sellerVerified
            ? <Badge className="self-start px-3 py-1.5 text-sm sm:self-center"><BadgeCheck aria-hidden="true" />Verified seller</Badge>
            : <Button variant={requested ? 'secondary' : 'default'} disabled={requested} onClick={() => void requestVerification()}>{requested ? 'Request under review' : 'Request verification'}</Button>}
        </Card>

        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="flex items-center gap-2 font-semibold"><Smartphone className="size-4 text-primary" aria-hidden="true" />Phone number</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {form.login_phone
                ? <>{formatPhone(form.login_phone)} · {form.phone_verified ? 'verified. You can sign in with it.' : 'not verified yet.'}</>
                : 'Add a phone number to sign in with it, get message texts and show buyers a "Phone verified" badge.'}
            </p>
          </div>
          <Button asChild variant={form.phone_verified ? 'outline' : 'default'} className="self-start sm:self-center"><Link to="/verify-phone">{form.phone_verified ? 'Change number' : form.login_phone ? 'Verify phone' : 'Add phone'}</Link></Button>
        </Card>

        <Card className="grid gap-4 p-4">
          <p className="flex items-center gap-2 font-semibold"><Bell className="size-4 text-primary" aria-hidden="true" />When someone messages you</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="message-sms" className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="size-4 text-muted-foreground" aria-hidden="true" />Text me</label>
              <p id="message-sms-hint" className="text-sm text-muted-foreground">{form.phone_verified ? 'A short text to your phone. One per conversation until you read it.' : 'Verify your phone number to get texts.'}</p>
            </div>
            <Switch id="message-sms" checked={form.phone_verified && form.sms_on_new_message} disabled={!form.phone_verified || savingAlerts === 'sms'} onCheckedChange={value => void setAlert('sms_on_new_message', value)} aria-describedby="message-sms-hint" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="message-emails" className="flex items-center gap-2 text-sm font-semibold"><Bell className="size-4 text-muted-foreground" aria-hidden="true" />Email me</label>
              <p id="message-emails-hint" className="text-sm text-muted-foreground">{form.email_verified ? 'One email per conversation until you read it.' : form.email ? 'Verify your email address to get emails.' : 'No email address on this account.'}</p>
            </div>
            <Switch id="message-emails" checked={form.email_verified && form.email_on_new_message} disabled={!form.email_verified || savingAlerts === 'email'} onCheckedChange={value => void setAlert('email_on_new_message', value)} aria-describedby="message-emails-hint" />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Your details</h2>
          <form className="grid gap-4" onSubmit={save}>
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" name="first_name" autoComplete="given-name" value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
              <FormField label="Last name" name="last_name" autoComplete="family-name" value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
            </div>
            <FormField label="Email address" name="email" type="email" value={form.email} placeholder="No email address" readOnly hint="Contact support to change your email address." />
            <PhoneNumberField label="Contact number for your ads" name="phone_number" value={form.phone_number} onChange={value => update('phone_number', value)} hint="Buyers see this number on your ads. Your sign-in number is set above." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="county">County</Label><Combobox id="county" options={countyOptions} value={form.county} onChange={value => update('county', value)} placeholder="Select county" searchPlaceholder="Search counties…" /></div>
              <FormField label="Town" name="town" value={form.town} onChange={e => update('town', e.target.value)} placeholder="Your town" />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">Preferred currency</span>
              <Segmented label="Preferred currency" value={form.preferred_currency} onChange={value => update('preferred_currency', value as Profile['preferred_currency'])} options={[{ value: LOCAL_CURRENCY, label: `${LOCAL_CURRENCY_NAME} (${LOCAL_CURRENCY_SYMBOL})` }, { value: 'USD', label: 'US dollar (US$)' }]} />
            </div>
            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={saving}>{saving ? <><Loader2 className="animate-spin" />Saving…</> : 'Save changes'}</Button>
          </form>
        </Card>

        <Button variant="ghost" className="justify-self-center text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void signOut()}><LogOut />Sign out</Button>
      </div>
    </AuthLayout>
  )
}
