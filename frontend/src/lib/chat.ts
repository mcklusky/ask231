import { api } from './api'

export type ChatConversation = {
  id: number
  advertisement_slug: string | null
  request_id: number | null
  listing_title: string
  listing_image_url: string | null
  other_user_name: string
  other_user_verified: boolean
  last_message: string
  unread_count: number
  updated_at: string
}

export type ChatMessage = {
  id: number
  sender_name: string
  is_mine: boolean
  body: string
  created_at: string
  read_at: string | null
}

export const chatApi = {
  unreadCount: () => api.get<{ count: number }>('/market/messages/unread-count/'),
  conversations: () => api.get<ChatConversation[]>('/market/messages/conversations/'),
  start: (advertisementSlug: string) => api.post<ChatConversation>('/market/messages/conversations/', { advertisement_slug: advertisementSlug }),
  messages: (conversationId: number) => api.get<ChatMessage[]>(`/market/messages/conversations/${conversationId}/messages/`),
  send: (conversationId: number, body: string) => api.post<ChatMessage>(`/market/messages/conversations/${conversationId}/messages/`, { body }),
}
