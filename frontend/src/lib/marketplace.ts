import { api } from './api'
import type { AxiosResponse } from 'axios'

export type SubCategory = { id: number; name: string; slug: string; is_active: boolean; sort_order: number; ad_count?: number }
export type Category = { id: number; name: string; slug: string; description: string; icon: string; is_active: boolean; sort_order: number; subcategories: SubCategory[]; ad_count?: number }
export type County = { id: number; name: string; slug: string }
export const liberianCounties: County[] = [
  { id: 1, name: 'Bomi', slug: 'bomi' }, { id: 2, name: 'Bong', slug: 'bong' },
  { id: 3, name: 'Gbarpolu', slug: 'gbarpolu' }, { id: 4, name: 'Grand Bassa', slug: 'grand-bassa' },
  { id: 5, name: 'Grand Cape Mount', slug: 'grand-cape-mount' }, { id: 6, name: 'Grand Gedeh', slug: 'grand-gedeh' },
  { id: 7, name: 'Grand Kru', slug: 'grand-kru' }, { id: 8, name: 'Lofa', slug: 'lofa' },
  { id: 9, name: 'Margibi', slug: 'margibi' }, { id: 10, name: 'Maryland', slug: 'maryland' },
  { id: 11, name: 'Montserrado', slug: 'montserrado' }, { id: 12, name: 'Nimba', slug: 'nimba' },
  { id: 13, name: 'River Cess', slug: 'river-cess' }, { id: 14, name: 'River Gee', slug: 'river-gee' },
  { id: 15, name: 'Sinoe', slug: 'sinoe' },
]
export type Town = { id: number; name: string; slug: string; county: number; county_name: string }
/** image_url: display copy (max 1600px WebP). thumbnail_url: small copy (max 480px) for cards and galleries. */
export type AdImage = { id: number; image_url: string; thumbnail_url: string; width: number | null; height: number | null; alt_text: string; sort_order: number; created_at: string }
export type Advertisement = {
  id: number; slug: string; title: string; description: string; price: string; currency: string; condition: 'new' | 'used'; status: 'pending' | 'active' | 'rejected' | 'sold' | 'expired' | 'suspended'; rejection_reason: string; phone_number: string; whatsapp_number: string; views_count: number;
  country: string; region: string; city: string; category: Category; subcategory: SubCategory; county: County | null; town: Town | null; images: AdImage[]; seller_name: string; seller_verified: boolean; created_at: string; updated_at: string; expires_at: string | null;
}
export function formatLocation(ad: Pick<Advertisement, 'country' | 'region' | 'city' | 'county' | 'town'>) {
  // "Liberia" is implied on a Liberian marketplace; foreign listings keep their country.
  const parts = ad.country.toLowerCase() === 'liberia' ? [ad.town?.name, ad.county?.name] : [ad.city || ad.town?.name, ad.region || ad.county?.name, ad.country]
  return parts.filter(Boolean).join(', ') || ad.country
}
// Both Liberian and US dollars circulate, so a bare "$" is ambiguous: always say L$ or US$.
const currencyPrefixes: Record<string, string> = { LRD: 'L$', USD: 'US$' }
export function formatCurrencyAmount(amount: number, currency: string) {
  const code = currency.toUpperCase()
  const digits = Number.isInteger(amount) ? 0 : 2
  const number = amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 })
  if (currencyPrefixes[code]) return `${currencyPrefixes[code]} ${number}`
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(amount) }
  catch { return `${code} ${number}` }
}
/** Short, unambiguous posting date: "Today", "Yesterday", "3 days ago", then "16 Nov" (adds the year if not this year). */
export function formatPostedDate(value: string, now = new Date()) {
  const date = new Date(value)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}
export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] }

let categoryRequest: Promise<AxiosResponse<Paginated<Category>>> | null = null
let categoryRequestStartedAt = 0
function getCategories() {
  if (categoryRequest && Date.now() - categoryRequestStartedAt < 60_000) return categoryRequest
  const request = api.get<Paginated<Category>>('/market/categories/')
  categoryRequest = request
  categoryRequestStartedAt = Date.now()
  request.catch(() => { if (categoryRequest === request) categoryRequest = null })
  return request
}

export const marketplaceApi = {
  categories: getCategories,
  counties: () => api.get<Paginated<County>>('/market/counties/'),
  towns: (countySlug: string) => api.get<Paginated<Town>>('/market/towns/', { params: { county: countySlug } }),
  advertisements: (page = 1, category?: string, search?: string, filters: { county?: string; town?: string; country?: string; subcategory?: string; condition?: string; currency?: string; min_price?: string; max_price?: string; ordering?: string } = {}) => api.get<Paginated<Advertisement>>('/market/advertisements/', { params: { page, ...(category ? { category } : {}), ...(search ? { q: search } : {}), ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) } }),
  popular: () => api.get<Advertisement[]>('/market/advertisements/popular/'),
  promoted: () => api.get<Advertisement[]>('/market/advertisements/promoted/'),
  advertisement: (slug: string) => api.get<Advertisement>(`/market/advertisements/${slug}/`),
  mine: (page = 1) => api.get<Paginated<Advertisement>>('/market/advertisements/mine/', { params: { page } }),
  create: (body: FormData) => api.post<Advertisement>('/market/advertisements/', body),
  update: (slug: string, body: FormData) => api.patch<Advertisement>(`/market/advertisements/${slug}/`, body),
  remove: (slug: string) => api.delete(`/market/advertisements/${slug}/`),
  removeImage: (slug: string, id: number) => api.delete(`/market/advertisements/${slug}/images/${id}/`),
  markSold: (slug: string) => api.post<Advertisement>(`/market/advertisements/${slug}/sold/`),
  favorites: () => api.get<Advertisement[]>('/market/favorites/'),
  addFavorite: (slug: string) => api.post('/market/favorites/', { advertisement_slug: slug }),
  removeFavorite: (slug: string) => api.delete(`/market/favorites/${slug}/`),
  report: (slug: string, reason: ReportReason, details: string) => api.post<{ detail: string }>('/market/reports/', { advertisement_slug: slug, reason, details }),
  resendVerificationEmail: () => api.post<{ detail: string }>('/auth/email/verify/'),
}

export type ReportReason = 'scam' | 'prohibited' | 'misleading' | 'harassment' | 'other'
export const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'scam', label: 'Possible scam or fraud' },
  { value: 'prohibited', label: 'Prohibited item' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'other', label: 'Something else' },
]
