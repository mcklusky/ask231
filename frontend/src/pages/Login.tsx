import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from '../lib/site-icons'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'

export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const { login } = useAuth(); const navigate = useNavigate()
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); try { await login(email, password); navigate('/account') } catch (e) { setError(messageFromError(e, 'We could not sign you in. Check your details and try again.')) } finally { setLoading(false) } }
  return <AuthLayout title="Welcome back" subtitle="Sign in to your MarketDay account."><form onSubmit={submit} className="auth-form" noValidate>{error && <div className="alert-error" role="alert">{error}</div>}<FormField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail size={17} />} /><FormField label="Password" labelAside={<Link to="/forgot-password" className="field-label-link">Forgot password?</Link>} name="password" id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required /><button className="primary-button" disabled={loading}>{loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}<span>→</span></button></form><div className="switch-auth">New to MarketDay? <Link to="/register">Create an account</Link></div></AuthLayout>
}
