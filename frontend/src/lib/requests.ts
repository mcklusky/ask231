import { api } from './api'
import type { ChatConversation } from './chat'
import type { Paginated } from './marketplace'

/** "I'm looking for…" requests: a member says what they need, sellers and service providers reply. */
export type BuyerRequest = {
  id: number
  title: string
  description: string
  category: { id: number; name: string; slug: string } | null
  location: string
  budget: string | null
  currency: string
  status: 'open' | 'closed' | 'hidden'
  requester_name: string
  requester_phone_verified: boolean
  is_mine: boolean
  responses_count: number | null
  created_at: string
  expires_at: string
}

export type NewBuyerRequest = { title: string; description: string; category_id: number | null; county_id: number | null; town_id: number | null; budget: string | null; currency: string }

export const requestsApi = {
  list: (params: { page?: number; q?: string; category?: string; county?: string } = {}) =>
    api.get<Paginated<BuyerRequest>>('/market/requests/', { params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)) }),
  mine: () => api.get<BuyerRequest[]>('/market/requests/mine/'),
  get: (id: number) => api.get<BuyerRequest>(`/market/requests/${id}/`),
  create: (body: NewBuyerRequest) => api.post<BuyerRequest>('/market/requests/', body),
  setStatus: (id: number, status: 'open' | 'closed') => api.patch<BuyerRequest>(`/market/requests/${id}/`, { status }),
  remove: (id: number) => api.delete(`/market/requests/${id}/`),
  respond: (id: number, body: string) => api.post<ChatConversation>(`/market/requests/${id}/respond/`, { body }),
}

export function formatBudget(request: Pick<BuyerRequest, 'budget' | 'currency'>) {
  if (!request.budget) return 'Budget open'
  const prefix = request.currency === 'LRD' ? 'L$' : request.currency === 'USD' ? 'US$' : `${request.currency} `
  return `Up to ${prefix}${Number(request.budget).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function timeAgo(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
