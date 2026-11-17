import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { messageFromError } from '../utils/errors'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'

export default function ResetPassword() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); try { await api.post('/auth/password-reset/confirm/', { uid: params.get('uid'), token: params.get('token'), new_password: password }); setDone(true) } catch (e) { setError(messageFromError(e, 'That reset link may have expired. Request a new one.')) } finally { setLoading(false) } }
  return <AuthLayout title={done ? 'Password updated' : 'Choose a new password'} subtitle={done ? 'Your account is ready to use again.' : 'Create a new password for your account.'}>{done ? <div className="success-panel"><p>Your password has been changed.</p><Link to="/login" className="primary-button button-link">Sign in <span>→</span></Link></div> : <form onSubmit={submit} className="auth-form">{error && <div role="alert" className="alert-error">{error}</div>}<FormField label="New password" name="new_password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required hint="Use 8 or more characters." /><button className="primary-button" disabled={loading}>{loading ? 'Updating…' : 'Update password'}<span>→</span></button></form>}</AuthLayout>
}
