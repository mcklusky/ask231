import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CircleCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { messageFromError } from '../utils/errors'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function ResetPassword() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await api.post('/auth/password-reset/confirm/', { uid: params.get('uid'), token: params.get('token'), new_password: password }); setDone(true) }
    catch (e) { setError(messageFromError(e, 'That reset link may have expired. Request a new one.')) }
    finally { setLoading(false) }
  }
  return (
    <AuthLayout title={done ? 'Password updated' : 'Choose a new password'} subtitle={done ? 'Your account is ready to use again.' : 'Create a new password for your account.'}>
      {done ? (
        <div className="grid gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950"><CircleCheck className="size-7" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">Your password has been changed. Sign in with your new password.</p>
          <Button asChild variant="cta" size="lg" className="w-full"><Link to="/login">Sign in<ArrowRight /></Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          {error && <Alert variant="error"><span>{error} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></span></Alert>}
          <FormField label="New password" name="new_password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required hint="Use 8 or more characters." />
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" />Updating…</> : <>Update password<ArrowRight /></>}</Button>
        </form>
      )}
    </AuthLayout>
  )
}
