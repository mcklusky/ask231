import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowRight, CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { emailVerificationApi, type VerifyEmailResult } from '../lib/api'
import { useAuth } from '../lib/auth'
import AuthLayout from '../components/AuthLayout'
import ResendVerificationEmail from '../components/ResendVerificationEmail'
import { messageFromError } from '../utils/errors'
import { toast } from 'sonner'
import { SITE_NAME } from '@/config/site'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type State = 'loading' | 'verified' | 'already_verified' | 'expired' | 'used' | 'invalid' | 'failed'

const COPY: Record<State, { title: string; subtitle: string }> = {
  loading: { title: 'Verifying your email', subtitle: 'Just a moment while we confirm your address.' },
  verified: { title: 'Email verified', subtitle: 'Thanks for confirming your email address.' },
  already_verified: { title: 'Already verified', subtitle: 'Your email address is confirmed.' },
  expired: { title: 'Link expired', subtitle: 'Verification links work for 24 hours.' },
  used: { title: 'Link already used', subtitle: 'Each link works once, and a newer link replaces older ones.' },
  invalid: { title: 'Link not valid', subtitle: 'We could not recognise this verification link.' },
  failed: { title: 'Something went wrong', subtitle: 'We could not check your link just now.' },
}

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { profile, signInWithTokens } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>(token ? 'loading' : 'invalid')
  const [detail, setDetail] = useState('')
  // A link works only once, so never send the same token twice (React runs effects twice in development).
  const checked = useRef('')

  useEffect(() => {
    if (!token || checked.current === token) return
    checked.current = token
    emailVerificationApi.confirm(token)
      .then(async ({ data }) => {
        setDetail(data.detail)
        // The link signs them in, so they land in their account without typing the password again.
        if (data.access && data.refresh) {
          try {
            await signInWithTokens({ access: data.access, refresh: data.refresh })
            toast.success('Email verified', { description: `Welcome to ${SITE_NAME}! You're signed in.` })
            navigate('/', { replace: true }); return
          }
          catch { /* fall back to the "sign in" button below */ }
        }
        setState('verified')
      })
      .catch(error => {
        const data = axios.isAxiosError(error) ? error.response?.data as Partial<VerifyEmailResult> | undefined : undefined
        const code = data?.code && data.code in COPY ? data.code as State : 'failed'
        setState(code); setDetail(code === 'failed' ? messageFromError(error, 'Please try again in a moment.') : data?.detail || '')
      })
  }, [token, signInWithTokens, navigate])

  const good = state === 'verified' || state === 'already_verified'
  const Icon = state === 'loading' ? Loader2 : good ? CircleCheck : CircleAlert
  const nextLink = profile ? '/' : '/login'
  return (
    <AuthLayout title={COPY[state].title} subtitle={COPY[state].subtitle}>
      <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className={cn('mx-auto grid size-14 place-items-center rounded-2xl', good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : state === 'loading' ? 'bg-secondary text-primary' : 'bg-destructive/10 text-destructive')}>
          <Icon className={cn('size-7', state === 'loading' && 'animate-spin')} aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground" role={state === 'loading' ? undefined : 'status'}>
          {state === 'loading' ? 'Checking your link…' : good ? `${detail || 'Your email is verified.'} You can now post ads, message sellers and make offers.` : detail || 'Ask for a new verification link below.'}
        </p>
        {good && <Button asChild variant="cta" size="lg" className="w-full"><Link to={nextLink}>{profile ? 'Start browsing' : 'Sign in'}<ArrowRight /></Link></Button>}
        {!good && state !== 'loading' && <>
          {profile?.email_verified
            ? <Button asChild variant="cta" size="lg" className="w-full"><Link to="/account">Go to my account<ArrowRight /></Link></Button>
            : <>
                <p className="text-sm font-semibold">Get a new link</p>
                <ResendVerificationEmail email={profile?.email || ''} askForEmail={!profile?.email} />
                <Link to="/login" className="text-sm font-semibold text-primary hover:underline dark:text-brand-primary">Back to sign in</Link>
              </>}
        </>}
      </div>
    </AuthLayout>
  )
}
