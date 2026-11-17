import axios, { type InternalAxiosRequestConfig } from 'axios'
import { SITE_NAME } from '@/config/site'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

/**
 * Link to share for an ad. Served by Django (/s/<slug>/) so WhatsApp, Facebook and X can read the ad's
 * title, price and photo; people opening it are forwarded to the ad page. In production VITE_API_URL is
 * "/api" (same site), locally it is the backend on port 8000.
 */
export function shareUrlFor(slug: string) {
  const base = API_URL.replace(/\/api\/?$/, '')
  return new URL(`${base}/s/${encodeURIComponent(slug)}/`, window.location.origin).toString()
}
export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })
export type Tokens = { access: string; refresh: string }
export type Profile = { id: number; email: string; first_name: string; last_name: string; email_verified: boolean; is_staff: boolean; phone_number: string; country_code: string; county: string; town: string; preferred_currency: 'LRD' | 'USD'; email_on_new_message: boolean; sms_on_new_message: boolean; login_phone: string; phone_verified: boolean; seller_profile: null | { business_name: string; bio: string; is_verified: boolean; verification_requested?: boolean } }

api.interceptors.request.use((config) => {
  const access = localStorage.getItem('marketday.access')
  if (access) config.headers.Authorization = `Bearer ${access}`
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) config.headers.delete('Content-Type')
  return config
})

// ---- Silent session renewal --------------------------------------------------------------
// Access tokens last 15 minutes; refresh tokens 7 days. When a request fails because the access
// token expired, get a new one with the refresh token and replay the request, so people stay
// signed in while they use the site instead of hitting errors every 15 minutes.
export const SESSION_EXPIRED_EVENT = 'marketday:session-expired'
const ACCESS_KEY = 'marketday.access'
const REFRESH_KEY = 'marketday.refresh'
let refreshInFlight: Promise<string | null> | null = null

function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

async function requestNewAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  try {
    // Plain axios (not `api`) so this call can never trigger the interceptor below.
    const { data } = await axios.post<Tokens>(`${API_URL}/auth/token/refresh/`, { refresh })
    localStorage.setItem(ACCESS_KEY, data.access)
    if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh) // refresh tokens rotate
    return data.access
  } catch {
    clearSession()
    return null
  }
}

/** One renewal at a time: refresh tokens are single-use, so parallel renewals would fail. */
export function renewAccessToken(): Promise<string | null> {
  if (!refreshInFlight) refreshInFlight = requestNewAccessToken().finally(() => { refreshInFlight = null })
  return refreshInFlight
}

api.interceptors.response.use(response => response, async error => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  const expired = error.response?.status === 401 && error.response?.data?.code === 'token_not_valid'
  const isAuthCall = original?.url?.includes('/auth/token')
  if (!original || !expired || isAuthCall || original._retried) return Promise.reject(error)
  original._retried = true
  const access = await renewAccessToken()
  if (!access) return Promise.reject(error)
  original.headers.Authorization = `Bearer ${access}`
  return api(original)
})

/** Phone sign-in: SMS codes for verifying a number and for resetting a password. */
export const phoneApi = {
  sendCode: (phone_number?: string) => api.post<{ detail: string; phone?: string }>('/auth/phone/send-code/', phone_number ? { phone_number } : {}),
  verify: (code: string) => api.post<Profile>('/auth/phone/verify/', { code }),
  requestReset: (phone_number: string) => api.post<{ detail: string }>('/auth/password-reset/', { phone_number }),
  confirmReset: (phone_number: string, code: string, new_password: string) => api.post<{ detail: string }>('/auth/password-reset/phone/', { phone_number, code, new_password }),
}

/** "+231770123456" -> "+231 770 123 456" */
export function formatPhone(phone: string) {
  const match = phone.match(/^\+231(\d{3})(\d{3})(\d{3})$/)
  return match ? `+231 ${match[1]} ${match[2]} ${match[3]}` : phone
}

/** What to call the member when they have no name: their email or phone. */
export function accountLabel(profile: Pick<Profile, 'email' | 'login_phone'>) {
  return profile.email || formatPhone(profile.login_phone) || `${SITE_NAME} member`
}
