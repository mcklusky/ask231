import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCheck, Loader2, MessageCircle, Send, ShieldCheck, Store } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { chatApi, type ChatConversation, type ChatMessage } from '../lib/chat'
import { messageFromError } from '../utils/errors'
import PublicHeader from '../components/PublicHeader'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'

const dayKey = (value: string) => new Date(value).toDateString()
function dayLabel(value: string) {
  const date = new Date(value), today = new Date(), yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function listTime(value: string) {
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('en-LR', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const messageTime = (value: string) => new Date(value).toLocaleTimeString('en-LR', { hour: 'numeric', minute: '2-digit' })

function EmptyThread() {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <div className="grid justify-items-center gap-3">
        <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-primary"><MessageCircle className="size-8" aria-hidden="true" /></span>
        <h2 className="font-display text-xl font-bold">Your conversations</h2>
        <p className="max-w-xs text-sm text-muted-foreground">Choose a chat to continue, or message a seller from any listing.</p>
        <Button asChild variant="outline"><Link to="/listings">Browse listings<ArrowRight /></Link></Button>
      </div>
    </div>
  )
}

export default function Messages() {
  const { conversationId } = useParams()
  const id = conversationId ? Number(conversationId) : null
  const { profile, ready } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLLIElement>(null)
  const activeConversation = conversations.find(conversation => conversation.id === id)

  useEffect(() => {
    if (!profile) return
    let alive = true
    const load = async () => {
      try { const { data } = await chatApi.conversations(); if (alive) setConversations(data) }
      catch (e) { if (alive) setError(messageFromError(e, 'We could not load your messages.')) }
      finally { if (alive) setLoadingInbox(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [profile])

  useEffect(() => {
    if (!id || !profile) { setMessages([]); return }
    let alive = true
    setLoadingMessages(true); setMessages([])
    const load = async () => {
      try {
        const { data } = await chatApi.messages(id)
        if (alive) {
          setMessages(current => {
            const known = new Set(current.map(message => message.id))
            const newMessages = data.filter(message => !known.has(message.id))
            return current.length === 0 ? data : newMessages.length ? [...current, ...newMessages] : current
          })
          setError('')
        }
      } catch (e) { if (alive) setError(messageFromError(e, 'This conversation could not be loaded.')) }
      finally { if (alive) setLoadingMessages(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 5000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [id, profile])

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, id])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!id || !draft.trim() || sending) return
    const body = draft.trim()
    setSending(true); setError('')
    try {
      const { data } = await chatApi.send(id, body)
      setMessages(current => current.some(message => message.id === data.id) ? current : [...current, data])
      setDraft('')
      void chatApi.conversations().then(({ data: updated }) => setConversations(updated)).catch(() => undefined)
    } catch (e) { setError(messageFromError(e, 'Your message could not be sent. Please try again.')) }
    finally { setSending(false) }
  }

  if (!ready) return <div className="grid min-h-dvh place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div>
  if (!profile) return <Navigate to="/login?next=/messages" replace />

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 text-foreground">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-[1160px] flex-1 sm:px-4 sm:py-5">
        <Card className="flex h-[calc(100dvh-67px)] w-full overflow-hidden rounded-none border-x-0 sm:h-[calc(100dvh-67px-2.5rem)] sm:rounded-xl sm:border-x">
          {/* Inbox */}
          <aside className={cn('w-full shrink-0 flex-col border-r md:flex md:w-80 lg:w-96', id ? 'hidden' : 'flex')} aria-label="Conversations">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-red">Your marketplace</p><h1 className="font-display text-xl font-extrabold">Messages</h1></div>
              <span className="grid min-w-8 place-items-center rounded-full bg-secondary px-2 py-1 text-xs font-bold text-primary">{conversations.length}</span>
            </div>
            {error && !id && <Alert variant="error" className="m-3">{error}</Alert>}
            <div className="flex-1 overflow-y-auto">
              {loadingInbox ? (
                <div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-primary" aria-label="Loading conversations" /></div>
              ) : conversations.length ? (
                <ul>
                  {conversations.map(conversation => {
                    const selected = id === conversation.id
                    return (
                      <li key={conversation.id}>
                        <Link to={`/messages/${conversation.id}`} aria-current={selected ? 'page' : undefined}
                          className={cn('flex items-center gap-3 border-b border-l-4 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none', selected ? 'border-l-primary bg-secondary/70' : 'border-l-transparent')}>
                          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                            {conversation.listing_image_url ? <img src={conversation.listing_image_url} alt="" className="h-full w-full object-cover" /> : <Store className="size-5" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <b className="flex min-w-0 items-center gap-1 truncate text-sm">{conversation.other_user_name}{conversation.other_user_verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified seller" />}</b>
                              <time className="shrink-0 text-[11px] text-muted-foreground">{listTime(conversation.updated_at)}</time>
                            </span>
                            <span className="block truncate text-xs font-medium text-primary dark:text-brand-blue">{conversation.listing_title}</span>
                            <span className={cn('block truncate text-xs', conversation.unread_count ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{conversation.last_message || 'No messages yet'}</span>
                          </span>
                          {conversation.unread_count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold text-white" aria-label={`${conversation.unread_count} unread`}>{conversation.unread_count}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="grid justify-items-center gap-2 p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><MessageCircle className="size-6" aria-hidden="true" /></span>
                  <b>No conversations yet</b>
                  <p className="text-sm text-muted-foreground">Ask a seller about an item to start a chat.</p>
                  <Button asChild variant="outline" size="sm"><Link to="/listings">Browse listings<ArrowRight /></Link></Button>
                </div>
              )}
            </div>
          </aside>

          {/* Thread */}
          <section className={cn('min-w-0 flex-1 flex-col', id ? 'flex' : 'hidden md:flex')} aria-label="Conversation">
            {id && activeConversation ? (
              <>
                <header className="flex items-center gap-3 border-b px-3 py-3 sm:px-4">
                  <Button asChild variant="ghost" size="icon-sm" className="md:hidden"><Link to="/messages" aria-label="Back to messages"><ArrowLeft /></Link></Button>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Store className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate font-semibold">{activeConversation.other_user_name}{activeConversation.other_user_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified seller" />}</p>
                    <Link to={`/ads/${activeConversation.advertisement_slug}`} className="block truncate text-xs text-muted-foreground hover:text-primary">About: {activeConversation.listing_title}</Link>
                  </div>
                  <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link to={`/ads/${activeConversation.advertisement_slug}`}>View listing<ArrowRight /></Link></Button>
                </header>
                <div className="flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6" aria-live="polite">
                  {loadingMessages ? (
                    <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-primary" aria-label="Loading messages" /></div>
                  ) : messages.length ? (
                    <ol className="grid gap-2">
                      {messages.map((message, index) => {
                        const newDay = index === 0 || dayKey(messages[index - 1].created_at) !== dayKey(message.created_at)
                        return (
                          <Fragment key={message.id}>
                            {newDay && <li className="my-2 flex justify-center" aria-hidden="true"><span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm ring-1 ring-border">{dayLabel(message.created_at)}</span></li>}
                            <li className={cn('flex', message.is_mine ? 'justify-end' : 'justify-start')}>
                              <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]', message.is_mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card text-card-foreground ring-1 ring-border')}>
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
                                <p className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]', message.is_mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                                  <time dateTime={message.created_at}>{messageTime(message.created_at)}</time>{message.is_mine && <CheckCheck className="size-3.5" aria-label="Sent" />}
                                </p>
                              </div>
                            </li>
                          </Fragment>
                        )
                      })}
                      <li ref={bottomRef} aria-hidden="true" />
                    </ol>
                  ) : (
                    <div className="grid h-full place-items-center text-center">
                      <div className="grid justify-items-center gap-2"><MessageCircle className="size-7 text-primary" aria-hidden="true" /><b>Start the conversation</b><span className="text-sm text-muted-foreground">Ask a question about {activeConversation.listing_title}.</span></div>
                    </div>
                  )}
                </div>
                {error && <Alert variant="error" className="mx-3 mb-2 sm:mx-4">{error}</Alert>}
                <form className="flex items-end gap-2 border-t bg-card px-3 py-3 sm:px-4" onSubmit={sendMessage}>
                  <label className="sr-only" htmlFor="chat-message">Write a message</label>
                  <Textarea id="chat-message" rows={1} maxLength={4000} placeholder="Write a message…" value={draft} onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }}
                    className="max-h-32 min-h-11 resize-none rounded-2xl py-2.5" />
                  <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
                </form>
                <p className="flex items-center justify-center gap-1.5 bg-card pb-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Keep chats on MarketDay. Never share verification codes or pay in advance.</p>
              </>
            ) : <EmptyThread />}
          </section>
        </Card>
      </main>
    </div>
  )
}
