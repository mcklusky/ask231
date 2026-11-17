import { ArrowLeft, Store } from '../lib/site-icons'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ThemeToggle } from '../lib/theme'

export default function MarketLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <main className="market-page"><header className="market-header"><Link to="/" className="brand"><span className="brand-mark"><Store size={20} /></span><span>marketday<span className="brand-country">LIBERIA</span></span></Link><div className="market-header-actions"><ThemeToggle /><Link to="/account" className="market-back"><ArrowLeft size={15} /> My account</Link></div></header><section className="market-content"><div className="market-heading"><span className="eyebrow">SELLER CENTRE</span><h1>{title}</h1><p>{subtitle}</p></div>{children}</section><footer className="market-footer">MarketDay Liberia <span>·</span> Made for local trade</footer></main>
}
