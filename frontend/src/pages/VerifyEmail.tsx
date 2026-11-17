import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import AuthLayout from '../components/AuthLayout'

export default function VerifyEmail() {
  const [params] = useSearchParams(); const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  useEffect(() => { const token = params.get('token'); if (!token) { setState('error'); return } api.post('/auth/email/verify/confirm/', { token }).then(() => setState('success')).catch(() => setState('error')) }, [params])
  return <AuthLayout title={state === 'loading' ? 'Verifying your email' : state === 'success' ? 'Email verified' : 'Link unavailable'} subtitle={state === 'loading' ? 'Just a moment while we confirm your address.' : state === 'success' ? 'Thanks for confirming your email address.' : 'This verification link may have expired.'}><div className="success-panel">{state === 'loading' ? <span className="spinner large-spinner" /> : <p>{state === 'error' ? 'Sign in and request a fresh verification email from your profile.' : 'Your account is now verified.'}</p>}<Link to="/login" className="primary-button button-link">Continue <span>→</span></Link></div></AuthLayout>
}
