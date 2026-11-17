import axios from 'axios'
import { SITE_NAME } from '@/config/site'
export function messageFromError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    // No response at all means the server is down or the connection dropped, not that the user typed something wrong.
    if (!error.response) return `We can’t reach ${SITE_NAME} right now. Check your internet connection and try again.`
    if (error.response.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
    if (error.response.status >= 500) return 'Something went wrong on our side. Please try again in a moment.'
    const data = error.response?.data as Record<string, unknown> | undefined
    // Expired/invalid sign-in tokens come back as technical JWT messages; show something people understand.
    if (data?.code === 'token_not_valid' || data?.detail === 'Authentication credentials were not provided.') return 'Your session has expired. Please sign in again.'
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.email === 'string') return data.email
    if (Array.isArray(data?.non_field_errors)) return String(data.non_field_errors[0])
    const first = data ? Object.values(data)[0] : undefined
    if (Array.isArray(first)) return String(first[0])
  }
  return fallback
}
