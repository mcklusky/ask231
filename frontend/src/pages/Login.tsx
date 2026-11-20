import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, UserRound } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import ResendVerificationEmail from '../components/ResendVerificationEmail'
import { unverifiedEmailFrom } from '../lib/api'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/config/site'

export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState<string | null>(null)
  const { login } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams()
  const next = params.get('next')
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setUnverified(null); setLoading(true)
    try { await login(email, password); navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/') /* home; account details live under the profile menu */ }
    catch (e) {
      const pending = unverifiedEmailFrom(e)
      if (pending !== null) setUnverified(pending)
      else setError(messageFromError(e, 'We could not sign you in. Check your details and try again.'))
    }
    finally { setLoading(false) }
  }
  return (
    <AuthLayout title="Welcome back" subtitle={`Sign in to your ${SITE_NAME} account.`}>
      {unverified !== null && <div role="status" className="mb-4 grid gap-3 rounded-lg border border-primary/25 bg-secondary p-4">
        <p className="text-sm text-secondary-foreground"><b className="block text-foreground">Please verify your email first</b>Open the link we sent to {unverified ? <b className="break-all">{unverified}</b> : 'your email'}, then sign in. No email? Send a new link.</p>
        <ResendVerificationEmail email={unverified} />
      </div>}
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label="Phone number or email" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="0770 123 456 or you@example.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<UserRound />} />
        <FormField label="Password" labelAside={<Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline dark:text-brand-primary">Forgot password?</Link>} name="password" id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Button type="submit" variant="cta" size="lg" className="mt-1 w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Signing in…</> : <>Sign in<ArrowRight /></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">New to {SITE_NAME}? <Link to="/register" className="font-semibold text-primary hover:underline dark:text-brand-primary">Create an account</Link></p>
    </AuthLayout>
  )
}
