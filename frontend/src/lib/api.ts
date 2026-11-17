import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })
export type Tokens = { access: string; refresh: string }
export type Profile = { id: number; email: string; first_name: string; last_name: string; email_verified: boolean; is_staff: boolean; phone_number: string; country_code: string; county: string; town: string; preferred_currency: 'LRD' | 'USD'; seller_profile: null | { business_name: string; bio: string; is_verified: boolean; verification_requested?: boolean } }

api.interceptors.request.use((config) => {
  const access = localStorage.getItem('marketday.access')
  if (access) config.headers.Authorization = `Bearer ${access}`
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) config.headers.delete('Content-Type')
  return config
})
