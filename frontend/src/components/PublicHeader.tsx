import { Link } from 'react-router-dom'
import { Plus, Store } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ThemeToggle } from '../lib/theme'

/** The one header for every public marketplace page, so links and the main call to action never drift apart. */
export default function PublicHeader() {
  const { profile } = useAuth()
  const sellTo = profile ? '/ads/new' : '/register'
  return <header className="public-header"><div className="public-header-inner">
    <Link to="/" className="brand" aria-label="MarketDay Liberia home"><span className="brand-mark"><Store size={20} aria-hidden="true" /></span><span>marketday<span className="brand-country">LIBERIA</span></span></Link>
    <nav aria-label="Main"><Link to="/listings">Buy smarter</Link><Link to={sellTo}>Sell faster</Link></nav>
    <div className="public-header-actions">
      {profile
        ? <><Link className="public-account-link" to="/messages">Messages</Link><Link className="public-account-link public-account-secondary" to="/account">My account</Link></>
        : <Link className="public-account-link" to="/login">Sign in</Link>}
      <ThemeToggle />
      <Link className="public-sell-button" to={sellTo}><Plus size={16} aria-hidden="true" /> <span className="sell-label-long">Post an ad</span><span className="sell-label-short" aria-hidden="true">Sell</span></Link>
    </div>
  </div></header>
}
