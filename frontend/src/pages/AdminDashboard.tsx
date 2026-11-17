import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Bell, Check, ChevronRight, ClipboardList, Flag, LayoutDashboard, MapPin, Megaphone, Package, Plus, Search, ShieldAlert, ShieldCheck, Store, Tag, Users } from '../lib/site-icons'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../utils/errors'
import { ThemeToggle } from '../lib/theme'
import { formatCurrencyAmount } from '../lib/marketplace'

type Tab = 'overview' | 'users' | 'sellers' | 'ads' | 'categories' | 'locations' | 'reports' | 'promotions'
type Row = Record<string, any>
type Stats = { users: number; sellers: number; suspended_users: number; pending_ads: number; active_ads: number; sold_ads: number; rejected_ads: number; expired_ads: number; suspended_ads: number; open_reports: number; active_promotions: number; recent_ads: Row[]; recent_reports: Row[] }
const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'users', label: 'Users', icon: Users }, { id: 'sellers', label: 'Sellers', icon: Store }, { id: 'ads', label: 'Advertisements', icon: Package }, { id: 'categories', label: 'Categories', icon: Tag }, { id: 'locations', label: 'Locations', icon: MapPin }, { id: 'reports', label: 'Reports', icon: Flag }, { id: 'promotions', label: 'Promotions', icon: Megaphone },
]
const endpoints: Partial<Record<Tab, string>> = { users: '/admin/users/', sellers: '/admin/sellers/', ads: '/admin/advertisements/', categories: '/admin/categories/', locations: '/admin/towns/', reports: '/admin/reports/', promotions: '/admin/promotions/' }
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: string }) {
  return <article className="admin-stat-card"><span className={`admin-stat-icon ${tone}`}><Icon size={19} /></span><div><small>{label}</small><b>{value.toLocaleString()}</b></div></article>
}
function AdminTable({ columns, rows, empty }: { columns: { key: string; label: string; render?: (row: Row) => ReactNode }[]; rows: Row[]; empty: string }) {
  if (!rows.length) return <div className="admin-empty"><ClipboardList size={25} /><b>Nothing here yet</b><span>{empty}</span></div>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filter, setFilter] = useState('')
  const [categories, setCategories] = useState<Row[]>([])
  const [counties, setCounties] = useState<Row[]>([])
  const [activeAds, setActiveAds] = useState<Row[]>([])
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState<{ count: number; next: string | null; previous: string | null }>({ count: 0, next: null, previous: null })

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true); setError(''); if (tab !== 'overview') setRows([])
    try {
      if (tab === 'overview') {
        const { data } = await api.get<Stats>('/admin/stats/')
        setStats(data)
      } else if (tab === 'categories') {
        const params: Record<string, string> = { page_size: '100' }
        if (search.trim()) params.search = search.trim()
        if (filter) params.is_active = filter
        const [cat, sub] = await Promise.all([api.get('/admin/categories/', { params }), api.get('/admin/subcategories/', { params: { page_size: 100 } })])
        const catRows = cat.data.results ?? cat.data
        const subRows = sub.data.results ?? sub.data
        setCategories(catRows.map((item: Row) => ({ ...item, subcategories: subRows.filter((child: Row) => child.category === item.id) })))
        setRows(catRows)
        setPageInfo({ count: catRows.length, next: null, previous: null })
      } else if (tab === 'locations') {
        const [countyResult, townResult] = await Promise.all([api.get('/admin/counties/', { params: { page_size: 100, search: search.trim() || undefined } }), api.get('/admin/towns/', { params: { page, page_size: 20, county: filter || undefined, search: search.trim() || undefined } })])
        setCounties(countyResult.data.results ?? countyResult.data)
        setRows(townResult.data.results ?? townResult.data)
        setPageInfo({ count: townResult.data.count ?? (townResult.data.results ?? townResult.data).length, next: townResult.data.next ?? null, previous: townResult.data.previous ?? null })
      } else {
        const endpoint = endpoints[tab]!
        const params: Record<string, string> = {}
        if (search.trim()) params.search = search.trim()
        if (tab === 'ads' && filter) params.status = filter
        if (tab === 'users' && filter) params.state = filter
        if (tab === 'sellers' && filter) params.verified = filter
        if (tab === 'reports' && filter) params.status = filter
        if (tab === 'promotions' && filter) params.status = filter
        params.page = String(page); params.page_size = '20'
        const { data } = await api.get(endpoint, { params })
        setRows(data.results ?? data)
        setPageInfo({ count: data.count ?? (data.results ?? data).length, next: data.next ?? null, previous: data.previous ?? null })
        if (tab === 'promotions') {
          const activeResult = await api.get('/admin/advertisements/', { params: { status: 'active', page_size: 100 } })
          setActiveAds(activeResult.data.results ?? activeResult.data)
        }
      }
    } catch (e) { setError(messageFromError(e, 'Could not load this admin section.')) }
    finally { setLoading(false) }
  }, [tab, search, filter, page])

  useEffect(() => { void load() }, [load])
  function reportError(e: unknown) { setError(messageFromError(e, 'The requested change could not be saved.')); setNotice('') }
  async function changed(message: string) { setNotice(message); setError(''); await load() }
  async function setUserActive(user: Row) {
    const next = !user.is_active
    if (next === false && !window.confirm(`Suspend ${user.email}? They will be unable to sign in.`)) return
    try { await api.post(`/admin/users/${user.id}/status/`, { is_active: next }); await changed(next ? 'Account reactivated.' : 'Account suspended.') } catch (e) { reportError(e) }
  }
  async function verifySeller(seller: Row) {
    try { await api.post(`/admin/sellers/${seller.id}/verification/`, { is_verified: !seller.is_verified }); await changed(seller.is_verified ? 'Seller verification removed.' : 'Seller verified.') } catch (e) { reportError(e) }
  }
  async function moderateAd(ad: Row, nextStatus: string) {
    const reason = ['rejected', 'suspended'].includes(nextStatus) ? window.prompt(nextStatus === 'rejected' ? 'Reason for rejection:' : 'Reason for suspension:') : ''
    if (['rejected', 'suspended'].includes(nextStatus) && !reason?.trim()) return
    try { await api.post(`/admin/advertisements/${ad.id}/moderation/`, { status: nextStatus, rejection_reason: reason || '' }); await changed(`Advertisement ${nextStatus}.`) } catch (e) { reportError(e) }
  }
  async function toggleActive(endpoint: string, row: Row, label: string) {
    try { await api.patch(`${endpoint}${row.id}/`, { is_active: !row.is_active }); await changed(`${label} ${row.is_active ? 'deactivated' : 'activated'}.`) } catch (e) { reportError(e) }
  }
  async function editCategory(category: Row) {
    const name = window.prompt('Category name:', category.name)
    if (!name?.trim()) return
    const description = window.prompt('Category description:', category.description || '')
    if (description === null) return
    const icon = window.prompt('Lucide icon name:', category.icon || '')
    if (icon === null) return
    try { await api.patch(`/admin/categories/${category.id}/`, { name: name.trim(), description: description.trim(), icon: icon.trim() }); await changed('Category details updated.') } catch (e) { reportError(e) }
  }
  async function editSubcategory(subcategory: Row) {
    const name = window.prompt('Subcategory name:', subcategory.name)
    if (!name?.trim()) return
    try { await api.patch(`/admin/subcategories/${subcategory.id}/`, { name: name.trim() }); await changed('Subcategory updated.') } catch (e) { reportError(e) }
  }
  async function editCounty(county: Row) {
    const name = window.prompt('County name:', county.name)
    if (!name?.trim()) return
    try { await api.patch(`/admin/counties/${county.id}/`, { name: name.trim() }); await changed('County updated.') } catch (e) { reportError(e) }
  }
  async function editTown(town: Row) {
    const name = window.prompt('Town name:', town.name)
    if (!name?.trim()) return
    try { await api.patch(`/admin/towns/${town.id}/`, { name: name.trim() }); await changed('Town updated.') } catch (e) { reportError(e) }
  }
  async function reschedulePromotion(promotion: Row) {
    const current = new Date(promotion.ends_at)
    const local = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    const end = window.prompt('Set a new promotion end date and time:', local)
    if (!end) return
    const ends_at = new Date(end).toISOString()
    try { await api.patch(`/admin/promotions/${promotion.id}/`, { ends_at }); await changed('Promotion schedule updated.') } catch (e) { reportError(e) }
  }
  async function updateReport(report: Row, status: string) {
    const resolution_note = status === 'resolved' || status === 'dismissed' ? window.prompt('Resolution note:', report.resolution_note || '') || '' : ''
    try { await api.post(`/admin/reports/${report.id}/resolve/`, { status, resolution_note }); await changed(`Report marked ${status}.`) } catch (e) { reportError(e) }
  }
  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try { await api.post('/admin/categories/', { name: form.get('name'), description: form.get('description'), icon: form.get('icon') }); event.currentTarget.reset(); await changed('Category created.') } catch (e) { reportError(e) }
  }
  async function createSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try { await api.post('/admin/subcategories/', { name: form.get('name'), category: Number(form.get('category')) }); event.currentTarget.reset(); await changed('Subcategory created.') } catch (e) { reportError(e) }
  }
  async function createCounty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try { await api.post('/admin/counties/', { name: form.get('name') }); event.currentTarget.reset(); await changed('County created.') } catch (e) { reportError(e) }
  }
  async function createTown(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try { await api.post('/admin/towns/', { name: form.get('name'), county: Number(form.get('county')) }); event.currentTarget.reset(); await changed('Town created.') } catch (e) { reportError(e) }
  }
  async function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try { await api.post('/admin/promotions/', { advertisement_slug: form.get('advertisement_slug'), kind: form.get('kind'), status: 'active', ends_at: new Date(String(form.get('ends_at'))).toISOString() }); event.currentTarget.reset(); await changed('Promotion created. No payment was processed.') } catch (e) { reportError(e) }
  }

  const controls = <>
    {tab === 'users' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select>}
    {tab === 'sellers' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All sellers</option><option value="true">Verified</option><option value="false">Unverified</option></select>}
    {tab === 'ads' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All statuses</option>{['pending', 'active', 'rejected', 'sold', 'expired', 'suspended'].map(status => <option key={status} value={status}>{titleCase(status)}</option>)}</select>}
    {tab === 'locations' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All counties</option>{counties.map(county => <option key={county.id} value={county.id}>{county.name}</option>)}</select>}
    {tab === 'categories' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All categories</option><option value="true">Active</option><option value="false">Inactive</option></select>}
    {tab === 'reports' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All reports</option>{['open', 'reviewing', 'resolved', 'dismissed'].map(status => <option value={status} key={status}>{titleCase(status)}</option>)}</select>}
    {tab === 'promotions' && <select className="admin-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All promotions</option>{['scheduled', 'active', 'ended', 'cancelled'].map(status => <option value={status} key={status}>{titleCase(status)}</option>)}</select>}
    {['users', 'sellers', 'ads', 'categories', 'locations', 'reports', 'promotions'].includes(tab) && <label className="admin-search"><Search size={15} /><input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={`Search ${tab}…`} /></label>}
  </>

  return <div className="admin-shell"><aside className="admin-sidebar"><Link to="/" className="admin-brand"><span className="brand-mark"><Store size={20} /></span><span>marketday<small>LIBERIA</small></span></Link><div className="admin-side-label">ADMINISTRATION</div><nav className="admin-nav">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'selected' : ''} onClick={() => { setTab(item.id); setFilter(''); setSearch(''); setSearchInput(''); setPage(1) }}><Icon size={17} /><span>{item.label}</span>{item.id === 'reports' && stats?.open_reports ? <i>{stats.open_reports}</i> : null}</button> })}</nav><div className="admin-sidebar-bottom"><div className="admin-user-chip"><span>{(profile?.first_name?.[0] || profile?.email?.[0] || 'A').toUpperCase()}</span><div><b>{profile?.first_name || 'Administrator'}</b><small>Staff account</small></div></div><Link to="/account">Account settings</Link></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span>MarketDay</span><ChevronRight size={14} /><b>{tabs.find(item => item.id === tab)?.label}</b></div><div className="admin-top-actions"><span className="admin-live-dot" /> Admin workspace <ThemeToggle /><Link to="/" aria-label="Open marketplace"><Bell size={17} /></Link></div></header><section className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">MARKETDAY LIBERIA</span><h1>{tab === 'overview' ? 'Marketplace overview' : tabs.find(item => item.id === tab)?.label}</h1><p>{tab === 'overview' ? 'Monitor activity and handle work that needs attention.' : sectionDescription(tab)}</p></div>{controls}</div>{error && <div className="alert-error admin-alert" role="alert">{error}</div>}{notice && <div className="alert-success admin-alert" role="status">{notice}</div>}{loading ? <div className="admin-loading"><span className="spinner large-spinner" /> Loading dashboard…</div> : tab === 'overview' ? <Overview stats={stats} onSelect={next => { setTab(next); setPage(1) }} /> : <section className="admin-panel">{renderSection()}{tab !== 'categories' && pageInfo.count > 20 && <div className="admin-pagination"><button disabled={!pageInfo.previous} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button><span>{Math.min((page - 1) * 20 + 1, pageInfo.count)}–{Math.min(page * 20, pageInfo.count)} of {pageInfo.count}</span><button disabled={!pageInfo.next} onClick={() => setPage(p => p + 1)}>Next</button></div>}</section>}</section></main></div>
  
  function renderSection(): ReactNode {
    if (tab === 'users') return <AdminTable rows={rows} empty="New accounts will appear here." columns={[{ key: 'email', label: 'ACCOUNT', render: row => <div className="admin-primary-cell"><b>{row.email}</b><small>{[row.first_name, row.last_name].filter(Boolean).join(' ') || 'Name not provided'}</small></div> }, { key: 'phone_number', label: 'PHONE' }, { key: 'joined_at', label: 'JOINED', render: row => fmtDate(row.joined_at) }, { key: 'is_active', label: 'STATUS', render: row => <StatusPill value={row.is_active ? 'active' : 'suspended'} /> }, { key: 'action', label: '', render: row => <button className={`admin-row-button ${row.is_active ? 'danger' : ''}`} onClick={() => void setUserActive(row)}>{row.is_active ? 'Suspend' : 'Reactivate'}</button> }]} />
    if (tab === 'sellers') return <AdminTable rows={rows} empty="Seller profiles will appear here." columns={[{ key: 'business_name', label: 'SELLER', render: row => <div className="admin-primary-cell"><b>{row.business_name || `${row.first_name} ${row.last_name}`}</b><small>{row.email}</small></div> }, { key: 'phone_number', label: 'PHONE' }, { key: 'listings_count', label: 'LISTINGS' }, { key: 'is_active', label: 'ACCOUNT', render: row => <StatusPill value={row.is_active ? 'active' : 'suspended'} /> }, { key: 'is_verified', label: 'VERIFICATION', render: row => <StatusPill value={row.is_verified ? 'verified' : 'unverified'} /> }, { key: 'action', label: '', render: row => <button className="admin-row-button" onClick={() => void verifySeller(row)}>{row.is_verified ? 'Remove badge' : 'Verify seller'}</button> }]} />
    if (tab === 'ads') return <AdminTable rows={rows} empty="No advertisements match this status." columns={[{ key: 'title', label: 'ADVERTISEMENT', render: row => <div className="admin-primary-cell"><b>{row.title}</b><small>{row.seller_email}</small></div> }, { key: 'category_name', label: 'CATEGORY' }, { key: 'county_name', label: 'LOCATION', render: row => [row.city || row.town_name, row.region || row.county_name, row.country].filter(Boolean).join(', ') }, { key: 'price', label: 'PRICE', render: row => formatCurrencyAmount(Number(row.price), row.currency) }, { key: 'status', label: 'STATUS', render: row => <StatusPill value={row.status} /> }, { key: 'action', label: 'REVIEW', render: row => <select className="admin-action-select" value="" onChange={e => e.target.value && void moderateAd(row, e.target.value)}><option value="">Choose…</option><option value="active">Approve</option><option value="rejected">Reject</option><option value="suspended">Suspend</option><option value="expired">Expire</option></select> }]} />
    if (tab === 'categories') return <div className="admin-stack"><form className="admin-inline-form" onSubmit={createCategory}><b>Add category</b><input name="name" placeholder="Category name" required maxLength={100} /><input name="description" placeholder="Short description" maxLength={240} /><input name="icon" placeholder="Lucide icon name" maxLength={50} /><button className="admin-primary-button"><Plus size={15} /> Add</button></form><form className="admin-inline-form subcategory-form" onSubmit={createSubcategory}><b>Add subcategory</b><select name="category" required defaultValue=""><option value="" disabled>Choose category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="name" placeholder="Subcategory name" required maxLength={100} /><button className="admin-secondary-button"><Plus size={15} /> Add subcategory</button></form><AdminTable rows={rows} empty="No categories available." columns={[{ key: 'name', label: 'CATEGORY', render: row => <div className="admin-primary-cell"><b>{row.name}</b><small>{row.subcategories?.length || 0} subcategories</small></div> }, { key: 'description', label: 'DESCRIPTION' }, { key: 'sort_order', label: 'ORDER' }, { key: 'is_active', label: 'STATUS', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> }, { key: 'actions', label: '', render: row => <div className="admin-action-group"><button className="admin-row-button" onClick={() => void editCategory(row)}>Edit</button><button className="admin-row-button" onClick={() => void toggleActive('/admin/categories/', row, 'Category')}>{row.is_active ? 'Deactivate' : 'Activate'}</button></div> }]} /><h3 className="admin-subheading">Subcategories</h3><AdminTable rows={categories.flatMap(item => (item.subcategories || []).map((sub: Row) => ({ ...sub, category_name: item.name })))} empty="Add subcategories to help sellers describe their listings." columns={[{ key: 'name', label: 'SUBCATEGORY' }, { key: 'category_name', label: 'CATEGORY' }, { key: 'is_active', label: 'STATUS', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> }, { key: 'action', label: '', render: row => <div className="admin-action-group"><button className="admin-row-button" onClick={() => void editSubcategory(row)}>Rename</button><button className="admin-row-button" onClick={() => void toggleActive('/admin/subcategories/', row, 'Subcategory')}>{row.is_active ? 'Deactivate' : 'Activate'}</button></div> }]} /></div>
    if (tab === 'locations') return <div className="admin-stack"><form className="admin-inline-form" onSubmit={createCounty}><b>Add county</b><input name="name" placeholder="County name" required maxLength={80} /><button className="admin-primary-button"><Plus size={15} /> Add county</button></form><form className="admin-inline-form" onSubmit={createTown}><b>Add town</b><input name="name" placeholder="Town name" required maxLength={100} /><select name="county" required defaultValue=""><option value="" disabled>Choose county</option>{counties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="admin-secondary-button"><Plus size={15} /> Add town</button></form><h3 className="admin-subheading">Counties</h3><AdminTable rows={counties} empty="No counties." columns={[{ key: 'name', label: 'COUNTY' }, { key: 'slug', label: 'URL SLUG' }, { key: 'is_active', label: 'STATUS', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> }, { key: 'action', label: '', render: row => <div className="admin-action-group"><button className="admin-row-button" onClick={() => void editCounty(row)}>Rename</button><button className="admin-row-button" onClick={() => void toggleActive('/admin/counties/', row, 'County')}>{row.is_active ? 'Deactivate' : 'Activate'}</button></div> }]} /><h3 className="admin-subheading">Towns</h3><AdminTable rows={rows} empty="No towns in this county." columns={[{ key: 'name', label: 'TOWN' }, { key: 'county_name', label: 'COUNTY' }, { key: 'slug', label: 'URL SLUG' }, { key: 'is_active', label: 'STATUS', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> }, { key: 'action', label: '', render: row => <div className="admin-action-group"><button className="admin-row-button" onClick={() => void editTown(row)}>Rename</button><button className="admin-row-button" onClick={() => void toggleActive('/admin/towns/', row, 'Town')}>{row.is_active ? 'Deactivate' : 'Activate'}</button></div> }]} /></div>
    if (tab === 'reports') return <AdminTable rows={rows} empty="No reports have been submitted." columns={[{ key: 'id', label: 'REPORT' }, { key: 'target_title', label: 'LISTING / ACCOUNT', render: row => <div className="admin-primary-cell"><b>{row.target_title || row.target_user_email || 'Unknown target'}</b><small>Reported by {row.reporter_email}</small></div> }, { key: 'reason', label: 'REASON', render: row => titleCase(row.reason) }, { key: 'details', label: 'DETAILS' }, { key: 'status', label: 'STATUS', render: row => <StatusPill value={row.status} /> }, { key: 'action', label: 'REVIEW', render: row => <select className="admin-action-select" value="" onChange={e => e.target.value && void updateReport(row, e.target.value)}><option value="">Choose…</option><option value="reviewing">Reviewing</option><option value="resolved">Resolve</option><option value="dismissed">Dismiss</option></select> }]} />
    if (tab === 'promotions') return <div className="admin-stack"><form className="admin-inline-form promotion-form" onSubmit={createPromotion}><b>Schedule promotion</b><select name="advertisement_slug" required defaultValue=""><option value="" disabled>Choose active advertisement</option>{activeAds.map(ad => <option key={ad.id} value={ad.slug}>{ad.title} · {ad.seller_email}</option>)}</select><select name="kind" required defaultValue="featured"><option value="featured">Featured</option><option value="sponsored">Sponsored</option><option value="top">Top listing</option><option value="urgent">Urgent</option></select><input name="ends_at" type="datetime-local" required min={new Date().toISOString().slice(0, 16)} /><button className="admin-primary-button"><Plus size={15} /> Schedule</button><small>No payment is processed by this dashboard.</small></form><AdminTable rows={rows} empty="No promotions are scheduled." columns={[{ key: 'advertisement_title', label: 'ADVERTISEMENT', render: row => <div className="admin-primary-cell"><b>{row.advertisement_title}</b><small>{row.advertisement_slug}</small></div> }, { key: 'kind', label: 'PLACEMENT', render: row => titleCase(row.kind) }, { key: 'status', label: 'STATUS', render: row => <StatusPill value={row.status} /> }, { key: 'starts_at', label: 'STARTS', render: row => fmtDate(row.starts_at) }, { key: 'ends_at', label: 'ENDS', render: row => fmtDate(row.ends_at) }, { key: 'action', label: '', render: row => <div className="admin-action-group">{row.status !== 'cancelled' && row.status !== 'ended' && <button className="admin-row-button" onClick={() => void reschedulePromotion(row)}>Reschedule</button>}<button className="admin-row-button danger" disabled={row.status === 'cancelled' || row.status === 'ended'} onClick={() => { if (window.confirm('Cancel this promotion?')) void api.patch(`/admin/promotions/${row.id}/`, { status: 'cancelled' }).then(() => changed('Promotion cancelled.')).catch(reportError) }}>Cancel</button></div> }]} /></div>
    return null
  }
}

function Overview({ stats, onSelect }: { stats: Stats | null; onSelect: (tab: Tab) => void }) {
  if (!stats) return <div className="admin-empty">Could not load marketplace statistics.</div>
  const adStates = [{ label: 'Active', value: stats.active_ads, color: 'active' }, { label: 'Pending review', value: stats.pending_ads, color: 'pending' }, { label: 'Sold', value: stats.sold_ads, color: 'sold' }, { label: 'Rejected', value: stats.rejected_ads, color: 'rejected' }, { label: 'Expired', value: stats.expired_ads, color: 'expired' }, { label: 'Suspended', value: stats.suspended_ads, color: 'suspended' }]
  const totalAds = adStates.reduce((sum, state) => sum + state.value, 0)
  return <><div className="admin-stat-grid"><StatCard label="Accounts" value={stats.users} icon={Users} tone="green" /><StatCard label="Seller profiles" value={stats.sellers} icon={Store} tone="blue" /><StatCard label="Active advertisements" value={stats.active_ads} icon={Package} tone="purple" /><StatCard label="Awaiting review" value={stats.pending_ads} icon={ClipboardList} tone="amber" /><StatCard label="Open reports" value={stats.open_reports} icon={Flag} tone="red" /><StatCard label="Suspended accounts" value={stats.suspended_users} icon={ShieldAlert} tone="slate" /><StatCard label="Sold products" value={stats.sold_ads} icon={Check} tone="teal" /><StatCard label="Live promotions" value={stats.active_promotions} icon={Megaphone} tone="orange" /></div><div className="admin-overview-grid"><div className="admin-overview-card"><div className="admin-card-heading"><div><b>Advertisement health</b><small>{totalAds.toLocaleString()} listings across all statuses</small></div><button className="admin-link-button" onClick={() => onSelect('ads')}>Manage listings <ChevronRight size={14} /></button></div><div className="admin-status-bars">{adStates.map(state => <div className="admin-status-row" key={state.label}><span>{state.label}</span><div className="admin-meter"><i className={`meter-${state.color}`} style={{ width: `${totalAds ? Math.max(state.value ? 3 : 0, state.value / totalAds * 100) : 0}%` }} /></div><b>{state.value.toLocaleString()}</b></div>)}</div></div><div className="admin-overview-card"><div className="admin-card-heading"><div><b>Recent listings</b><small>Latest advertisements added</small></div><button className="admin-link-button" onClick={() => onSelect('ads')}>View all <ChevronRight size={14} /></button></div><div className="admin-recent-list">{stats.recent_ads.length ? stats.recent_ads.map(ad => <div className="admin-recent-row" key={ad.id}><span className={`admin-mini-status status-${ad.status}`} /><div><b>{ad.title}</b><small>{ad.seller__email} · {fmtDate(ad.created_at)}</small></div><StatusPill value={ad.status} /></div>) : <p className="admin-quiet-empty">No listings have been posted yet.</p>}</div></div><div className="admin-overview-card"><div className="admin-card-heading"><div><b>Reports needing attention</b><small>{stats.open_reports} open or under review</small></div><button className="admin-link-button" onClick={() => onSelect('reports')}>Review queue <ChevronRight size={14} /></button></div><div className="admin-recent-list">{stats.recent_reports.length ? stats.recent_reports.map(report => <div className="admin-recent-row" key={report.id}><span className="admin-mini-status status-open" /><div><b>{report.advertisement__title || report.reported_user__email || `Report #${report.id}`}</b><small>{titleCase(report.reason)} · {fmtDate(report.created_at)}</small></div><StatusPill value={report.status} /></div>) : <p className="admin-quiet-empty">No reports are waiting right now.</p>}</div></div><button className="admin-work-card" onClick={() => onSelect('users')}><span className="admin-work-icon slate"><ShieldCheck size={18} /></span><div><b>Account management</b><small>Review member access, activity, and seller verification</small></div><ChevronRight size={17} /></button></div></>
}
function StatusPill({ value }: { value: string }) { return <span className={`admin-status status-${value}`}>{titleCase(value)}</span> }
function fmtDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function sectionDescription(tab: Tab) { return ({ users: 'Review member accounts and control access.', sellers: 'Manage seller profiles and verification badges.', ads: 'Review, approve, reject, or suspend advertisements.', categories: 'Maintain the categories sellers use for listings.', locations: 'Manage the Liberia counties and their towns.', reports: 'Review user-submitted reports and record outcomes.', promotions: 'Schedule listing placements without processing payments.', overview: '' })[tab] }
