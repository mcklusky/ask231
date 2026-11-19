import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import AuthLayout from '../components/AuthLayout'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function VerifyEmail() {
  const [params] = useSearchParams(); const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  useEffect(() => { const token = params.get('token'); if (!token) { setState('error'); return } api.post('/auth/email/verify/confirm/', { token }).then(() => setState('success')).catch(() => setState('error')) }, [params])
  const Icon = state === 'loading' ? Loader2 : state === 'success' ? CircleCheck : CircleAlert
  return (
    <AuthLayout title={state === 'loading' ? 'Verifying your email' : state === 'success' ? 'Email verified' : 'Link unavailable'} subtitle={state === 'loading' ? 'Just a moment while we confirm your address.' : state === 'success' ? 'Thanks for confirming your email address.' : 'This verification link may have expired.'}>
      <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className={cn('mx-auto grid size-14 place-items-center rounded-2xl', state === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : state === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary')}>
          <Icon className={cn('size-7', state === 'loading' && 'animate-spin')} aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">{state === 'loading' ? 'Checking your link…' : state === 'error' ? 'Sign in and use “Resend link” on your account page to get a fresh email.' : 'You can now post ads, message sellers and make offers.'}</p>
        {state !== 'loading' && <Button asChild variant="cta" size="lg" className="w-full"><Link to={state === 'success' ? '/account' : '/login'}>Continue<ArrowRight /></Link></Button>}
      </div>
    </AuthLayout>
  )
}
