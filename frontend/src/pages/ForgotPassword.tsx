import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from '../lib/site-icons'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { api } from '../lib/api'
import { messageFromError } from '../utils/errors'

export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); try { await api.post('/auth/password-reset/', { email }); setSent(true) } catch (e) { setError(messageFromError(e, 'Please try again in a moment.')) } finally { setLoading(false) } }
  return <AuthLayout title={sent ? 'Check your inbox' : 'Forgot your password?'} subtitle={sent ? 'If an account matches that email, we sent reset instructions.' : 'Enter the email address linked to your account.'}>{sent ? <div className="success-panel"><span className="success-icon"><Mail size={22} /></span><p>For your security, we only send reset instructions when an account exists. Check your inbox and spam folder.</p><Link className="primary-button button-link" to="/login">Back to sign in <span>→</span></Link></div> : <form onSubmit={submit} className="auth-form">{error && <div className="alert-error" role="alert">{error}</div>}<FormField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail size={17} />} /><button className="primary-button" disabled={loading}>{loading ? <><span className="spinner" /> Sending…</> : 'Send reset link'}<span>→</span></button><Link className="back-to-login" to="/login"><ArrowLeft size={15} /> Back to sign in</Link></form>}</AuthLayout>
}
