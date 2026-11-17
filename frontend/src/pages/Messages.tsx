import { ArrowLeft, ArrowRight, BadgeCheck, Check, MessageCircle, Send, Store } from '../lib/site-icons'
import { ArrowRight as HeaderArrowRight, Store as HeaderStore } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { chatApi, type ChatConversation, type ChatMessage } from '../lib/chat'
import { messageFromError } from '../utils/errors'
import { ThemeToggle } from '../lib/theme'

function shortTime(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-LR', { month: 'short', day: 'numeric' })
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-LR', { hour: 'numeric', minute: '2-digit' })
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeConversation = conversations.find(conversation => conversation.id === id)

  useEffect(() => {
    if (!profile) return
    let alive = true
    const load = async () => {
      try {
        const { data } = await chatApi.conversations()
        if (alive) setConversations(data)
      } catch (e) {
        if (alive) setError(messageFromError(e, 'We could not load your messages.'))
      } finally {
        if (alive) setLoadingInbox(false)
      }
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
      } catch (e) {
        if (alive) setError(messageFromError(e, 'This conversation could not be loaded.'))
      } finally {
        if (alive) setLoadingMessages(false)
      }
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

  if (!ready) return <div className="chat-loading"><span className="spinner large-spinner"/></div>
  if (!profile) return <Navigate to="/login" replace />

  return <div className="public-market jiji-market chat-page"><header className="public-header"><div className="public-header-inner"><Link to="/" className="brand"><span className="brand-mark"><HeaderStore size={20}/></span><span>marketday<span className="brand-country">LIBERIA</span></span></Link><nav><Link to="/listings">Buy smarter</Link><Link to="/ads/new">Sell faster</Link></nav><div className="public-header-actions"><Link className="public-account-link" to="/account">My account</Link><ThemeToggle /><Link className="public-sell-button" to="/">Marketplace <HeaderArrowRight size={14}/></Link></div></div></header>
    <main className={`chat-layout ${id ? 'has-active-chat' : ''}`}>
      <aside className="chat-inbox-pane"><div className="chat-inbox-heading"><div><span className="public-eyebrow">YOUR MARKETPLACE</span><h1>Messages</h1></div><span className="chat-count">{conversations.length}</span></div>
        {error && !id && <div className="chat-error" role="alert">{error}</div>}
        {loadingInbox ? <div className="chat-inbox-loading"><span className="spinner large-spinner"/></div> : conversations.length ? <div className="chat-conversation-list">{conversations.map(conversation => <Link key={conversation.id} to={`/messages/${conversation.id}`} className={`chat-conversation ${id === conversation.id ? 'selected' : ''}`}><span className="chat-listing-thumb">{conversation.listing_image_url ? <img src={conversation.listing_image_url} alt=""/> : <Store size={20}/>}</span><span className="chat-conversation-copy"><span className="chat-conversation-top"><b>{conversation.other_user_name}{conversation.other_user_verified && <BadgeCheck size={13}/>}</b><time>{shortTime(conversation.updated_at)}</time></span><small className="chat-listing-title">{conversation.listing_title}</small><span className="chat-last-message">{conversation.last_message}</span></span>{conversation.unread_count > 0 && <span className="chat-unread-count">{conversation.unread_count}</span>}</Link>)}</div> : <div className="chat-inbox-empty"><span><MessageCircle size={23}/></span><b>No conversations yet</b><p>Ask a seller about an item to start a chat.</p><Link to="/listings">Browse listings <ArrowRight size={14}/></Link></div>}
      </aside>
      <section className="chat-thread-pane">
        {id ? activeConversation ? <><header className="chat-thread-header"><Link className="chat-mobile-back" to="/messages" aria-label="Back to messages"><ArrowLeft size={18}/></Link><span className="chat-thread-avatar"><Store size={19}/></span><span className="chat-thread-person"><b>{activeConversation.other_user_name}{activeConversation.other_user_verified && <BadgeCheck size={14}/>}</b><Link to={`/ads/${activeConversation.advertisement_slug}`}>About: {activeConversation.listing_title}</Link></span><Link className="chat-view-listing" to={`/ads/${activeConversation.advertisement_slug}`}>View listing <ArrowRight size={14}/></Link></header><div className="chat-message-list" aria-live="polite">{loadingMessages ? <div className="chat-inbox-loading"><span className="spinner large-spinner"/></div> : messages.length ? <>{messages.map(message => <article key={message.id} className={`chat-message-row ${message.is_mine ? 'mine' : ''}`}><div className="chat-message-bubble"><p>{message.body}</p><span><time>{messageTime(message.created_at)}</time>{message.is_mine && <Check size={13}/>}</span></div></article>)}<div ref={bottomRef}/></> : <div className="chat-start-hint"><MessageCircle size={21}/><b>Start the conversation</b><span>Ask a question about {activeConversation.listing_title}.</span></div>}</div>{error && <div className="chat-error chat-thread-error" role="alert">{error}</div>}<form className="chat-composer" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Write a message</label><textarea id="chat-message" rows={1} maxLength={4000} placeholder="Write a message…" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} /><button aria-label="Send message" type="submit" disabled={!draft.trim() || sending}>{sending ? <span className="spinner"/> : <Send size={18}/>}</button></form><p className="chat-safety-note">Keep your conversations on MarketDay and never share verification codes.</p></> : <div className="chat-thread-empty"><span><MessageCircle size={30}/></span><h2>Your conversations</h2><p>Choose a chat to continue, or contact a seller from a listing.</p><Link to="/listings">Browse listings <ArrowRight size={15}/></Link></div> : <div className="chat-thread-empty"><span><MessageCircle size={30}/></span><h2>Your conversations</h2><p>Choose a chat to continue, or contact a seller from a listing.</p><Link to="/listings">Browse listings <ArrowRight size={15}/></Link></div>}
      </section>
    </main><footer className="chat-footer"><Link to="/">MarketDay Liberia</Link><span>Local finds. Liberian pride.</span></footer>
  </div>
}
