import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, List, LogOut, MessageCircle, Plus, ShieldCheck, UserRound } from '../lib/site-icons'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import PhoneNumberField from '../components/PhoneNumberField'
import VerifyEmailNotice from '../components/VerifyEmailNotice'
import { api, type Profile } from '../lib/api'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'

const counties = ['Bomi', 'Bong', 'Gbarpolu', 'Grand Bassa', 'Grand Cape Mount', 'Grand Gedeh', 'Grand Kru', 'Lofa', 'Margibi', 'Maryland', 'Montserrado', 'Nimba', 'River Cess', 'River Gee', 'Sinoe']

export default function Account() {
  const { profile, setProfile, logout } = useAuth()
  const [form, setForm] = useState<Profile | null>(profile)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
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
    setError(''); setNotice(''); setSaving(true)
    try {
      const { data } = await api.patch<Profile>('/auth/profile/', { first_name: form.first_name, last_name: form.last_name, phone_number: form.phone_number, county: form.county, town: form.town, preferred_currency: form.preferred_currency })
      setForm(data); setProfile(data); setNotice('Your profile has been saved.')
    } catch (e) { setError(messageFromError(e, 'We could not save those changes.')) }
    finally { setSaving(false) }
  }

  async function signOut() { await logout(); navigate('/login') }
  async function requestVerification() { setError(''); try { await api.post('/auth/seller/verification-request/'); const {data} = await api.get<Profile>('/auth/profile/'); setProfile(data); setForm(data); setVerificationMessage('Your seller verification request has been submitted.') } catch(e) { setError(messageFromError(e, 'Could not submit your request.')) } }

  if (loading) return <AuthLayout title="Your account" subtitle="Loading your profile."><div className="loading-state"><span className="spinner large-spinner" /></div></AuthLayout>
  if (!form) return <AuthLayout title="Sign in required" subtitle={error || 'Sign in to manage your profile.'}><Link className="primary-button button-link" to="/login">Go to sign in <span>→</span></Link></AuthLayout>

  return <AuthLayout title="Your account" subtitle="Manage your personal details and preferences.">
    <div className="seller-tools"><Link to="/my-ads"><List size={16} /> My advertisements</Link><Link to="/favorites"><BadgeCheck size={16} /> Saved listings</Link><Link to="/messages"><MessageCircle size={16} /> Messages</Link><Link to="/ads/new"><Plus size={16} /> Post an advertisement</Link>{profile?.is_staff && <Link to="/admin"><ShieldCheck size={16} /> Admin dashboard</Link>}</div>
    {verificationMessage && <div className="alert-success" role="status">{verificationMessage}</div>}
    <VerifyEmailNotice />

    <section className="verification-panel"><div><b>Seller verification</b><p>Verified sellers receive a badge on their listings. Our team reviews requests.</p></div>{form.seller_profile?.is_verified ? <span className="verify-badge verified"><BadgeCheck size={14}/> Verified seller</span> : <button type="button" className="admin-secondary-button" disabled={form.seller_profile?.verification_requested} onClick={() => void requestVerification()}>{form.seller_profile?.verification_requested ? 'Request under review' : 'Request verification'}</button>}</section>
    <div className="account-summary"><span className="account-avatar"><UserRound size={23} /></span><div><b>{form.first_name} {form.last_name}</b><small>{form.email}</small></div><span className={`verify-badge ${form.email_verified ? 'verified' : ''}`}>{form.email_verified ? <><BadgeCheck size={14} /> Email verified</> : 'Email not verified'}</span></div>
    {error && <div className="alert-error" role="alert">{error}</div>}{notice && <div className="alert-success" role="status">{notice}</div>}
    <form className="auth-form account-form" onSubmit={save}>
      <div className="two-fields"><FormField label="First name" name="first_name" value={form.first_name} onChange={e => update('first_name', e.target.value)} required /><FormField label="Last name" name="last_name" value={form.last_name} onChange={e => update('last_name', e.target.value)} required /></div>
      <FormField label="Email address" name="email" type="email" value={form.email} readOnly />
      <PhoneNumberField label="Phone number" name="phone_number" value={form.phone_number} onChange={value => update('phone_number', value)} hint="Choose your country code, or enter one under Other." />
      <div className="two-fields"><div className="field"><label htmlFor="county">County</label><div className="input-shell"><select id="county" value={form.county} onChange={e => update('county', e.target.value)}><option value="">Select county</option>{counties.map(c => <option key={c}>{c}</option>)}</select></div></div><FormField label="Town" name="town" value={form.town} onChange={e => update('town', e.target.value)} placeholder="Your town" /></div>
      <div className="field"><label htmlFor="currency">Preferred currency</label><div className="input-shell"><select id="currency" value={form.preferred_currency} onChange={e => update('preferred_currency', e.target.value as Profile['preferred_currency'])}><option value="USD">US Dollar (USD)</option><option value="LRD">Liberian Dollar (LRD)</option></select></div></div>
      <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}<span>→</span></button>
    </form>
    <button className="signout-button" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
    <p className="account-note"><ShieldCheck size={14} /> Your account details are private.</p>
  </AuthLayout>
}
