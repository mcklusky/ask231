import axios from 'axios'
export function messageFromError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.email === 'string') return data.email
    if (Array.isArray(data?.non_field_errors)) return String(data.non_field_errors[0])
    const first = data ? Object.values(data)[0] : undefined
    if (Array.isArray(first)) return String(first[0])
  }
  return fallback
}
