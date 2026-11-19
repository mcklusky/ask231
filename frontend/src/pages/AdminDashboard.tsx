import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, ChevronDown, ChevronRight, ClipboardList, ExternalLink, Flag, LayoutDashboard, Loader2, MapPin, Megaphone, Moon, Package, Plus, Search, ShieldAlert, Store, Sun, Tag, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { messageFromError } from '../utils/errors'
import { formatCurrencyAmount } from '../lib/marketplace'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePromptDialog } from '@/components/ui/prompt-dialog'
import { COUNTRY_NAME, SITE_NAME } from '@/config/site'
import { BrandLockup, LogoMark } from '@/components/Brand'

type Tab = 'overview' | 'users' | 'sellers' | 'ads' | 'categories' | 'locations' | 'reports' | 'promotions'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type Stats = { users: number; sellers: number; suspended_users: number; pending_ads: number; active_ads: number; sold_ads: number; rejected_ads: number; expired_ads: number; suspended_ads: number; open_reports: number; active_promotions: number; recent_ads: Row[]; recent_reports: Row[] }
type Column = { key: string; label: string; render?: (row: Row) => ReactNode }

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'users', label: 'Users', icon: Users }, { id: 'sellers', label: 'Sellers', icon: Store }, { id: 'ads', label: 'Advertisements', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tag }, { id: 'locations', label: 'Locations', icon: MapPin }, { id: 'reports', label: 'Reports', icon: Flag }, { id: 'promotions', label: 'Promotions', icon: Megaphone },
]
const endpoints: Partial<Record<Tab, string>> = { users: '/admin/users/', sellers: '/admin/sellers/', ads: '/admin/advertisements/', categories: '/admin/categories/', locations: '/admin/towns/', reports: '/admin/reports/', promotions: '/admin/promotions/' }
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const toLocalInput = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const sectionDescription: Record<Tab, string> = { overview: 'Monitor activity and handle work that needs attention.', users: 'Review member accounts and control access.', sellers: 'Manage seller profiles and verification badges.', ads: 'Review, approve, reject, or suspend advertisements.', categories: 'Maintain the categories sellers use for listings.', locations: `Manage the ${COUNTRY_NAME} counties and their towns.`, reports: 'Review user-submitted reports and record outcomes.', promotions: 'Schedule listing placements without processing payments.' }

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  active: 'success', verified: 'success', resolved: 'success',
  pending: 'warning', reviewing: 'warning', scheduled: 'warning',
  rejected: 'danger', suspended: 'danger', open: 'danger',
  sold: 'secondary', inactive: 'secondary', unverified: 'outline', ended: 'outline', cancelled: 'outline', expired: 'outline', dismissed: 'outline',
}
function StatusPill({ value }: { value: string }) { return <Badge variant={STATUS_VARIANT[value] ?? 'outline'}>{titleCase(value)}</Badge> }
const selectClass = 'h-10 min-w-0 max-sm:w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

function PrimaryCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return <div className="min-w-0"><p className="truncate font-semibold text-foreground">{title}</p>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div>
}

function DataTable({ columns, rows, empty }: { columns: Column[]; rows: Row[]; empty: string }) {
  if (!rows.length) return (
    <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><ClipboardList className="size-6" aria-hidden="true" /></span>
      <b>Nothing here yet</b><p className="text-sm text-muted-foreground">{empty}</p>
    </div>
  )
  const lastIsActions = columns[columns.length - 1]?.key.startsWith('action')
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>{columns.map((column, i) => <th key={column.key} scope="col" className={cn('h-10 whitespace-nowrap px-4 font-semibold', lastIsActions && i === columns.length - 1 && 'sticky right-0 bg-muted text-right')}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index} className="border-t transition-colors hover:bg-muted/40">
              {columns.map((column, i) => (
                <td key={column.key} className={cn('px-4 py-3 align-middle text-muted-foreground', lastIsActions && i === columns.length - 1 && 'sticky right-0 bg-card text-right shadow-[-8px_0_8px_-8px_rgba(15,30,45,0.25)]')}>
                  {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, tone, onClick }: { label: string; value: number; icon: typeof Users; tone: string; onClick?: () => void }) {
  const body = <><span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" aria-hidden="true" /></span><span className="min-w-0"><span className="block truncate text-xs font-medium text-muted-foreground">{label}</span><span className="block font-display text-2xl font-extrabold tabular-nums">{value.toLocaleString()}</span></span></>
  return onClick
    ? <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</button>
    : <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">{body}</div>
}

function Overview({ stats, onSelect }: { stats: Stats | null; onSelect: (tab: Tab, filter?: string) => void }) {
  if (!stats) return <Alert variant="error">Could not load marketplace statistics.</Alert>
  const adStates = [
    { label: 'Active', value: stats.active_ads, bar: 'bg-emerald-500' }, { label: 'Pending review', value: stats.pending_ads, bar: 'bg-amber-500' }, { label: 'Sold', value: stats.sold_ads, bar: 'bg-primary' },
    { label: 'Rejected', value: stats.rejected_ads, bar: 'bg-destructive' }, { label: 'Expired', value: stats.expired_ads, bar: 'bg-slate-400' }, { label: 'Suspended', value: stats.suspended_ads, bar: 'bg-rose-800' },
  ]
  const totalAds = adStates.reduce((sum, state) => sum + state.value, 0)
  const ListHeader = ({ title, subtitle, action, tab, filter }: { title: string; subtitle: string; action: string; tab: Tab; filter?: string }) => (
    <div className="flex items-start justify-between gap-3 border-b p-4"><div><p className="font-display font-bold">{title}</p><p className="text-xs text-muted-foreground">{subtitle}</p></div><Button variant="link" size="sm" className="h-auto px-0" onClick={() => onSelect(tab, filter)}>{action}<ChevronRight /></Button></div>
  )
  return (
    <div className="grid gap-4 [&>*]:min-w-0">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard label="Accounts" value={stats.users} icon={Users} tone="bg-secondary text-primary" onClick={() => onSelect('users')} />
        <StatCard label="Seller profiles" value={stats.sellers} icon={Store} tone="bg-secondary text-primary" onClick={() => onSelect('sellers')} />
        <StatCard label="Live ads" value={stats.active_ads} icon={Package} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" onClick={() => onSelect('ads', 'active')} />
        <StatCard label="Awaiting review" value={stats.pending_ads} icon={ClipboardList} tone="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" onClick={() => onSelect('ads', 'pending')} />
        <StatCard label="Open reports" value={stats.open_reports} icon={Flag} tone="bg-destructive/10 text-destructive" onClick={() => onSelect('reports', 'open')} />
        <StatCard label="Suspended accounts" value={stats.suspended_users} icon={ShieldAlert} tone="bg-muted text-muted-foreground" onClick={() => onSelect('users', 'suspended')} />
        <StatCard label="Sold" value={stats.sold_ads} icon={Check} tone="bg-secondary text-primary" />
        <StatCard label="Live promotions" value={stats.active_promotions} icon={Megaphone} tone="bg-brand-accent/10 text-brand-accent" onClick={() => onSelect('promotions', 'active')} />
      </div>
      <Card>
        <ListHeader title="Advertisement health" subtitle={`${totalAds.toLocaleString()} listings across all statuses`} action="Manage listings" tab="ads" />
        <div className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2">
          {adStates.map(state => (
            <div key={state.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{state.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', state.bar)} style={{ width: `${totalAds ? Math.max(state.value ? 3 : 0, (state.value / totalAds) * 100) : 0}%` }} /></div>
              <b className="text-right tabular-nums">{state.value.toLocaleString()}</b>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <ListHeader title="Recent listings" subtitle="Latest advertisements added" action="View all" tab="ads" />
          {stats.recent_ads.length ? <ul>{stats.recent_ads.map(ad => (
            <li key={ad.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"><PrimaryCell title={ad.title} subtitle={`${ad.seller__email} · ${fmtDate(ad.created_at)}`} /><span className="ml-auto shrink-0"><StatusPill value={ad.status} /></span></li>
          ))}</ul> : <p className="p-4 text-sm text-muted-foreground">No listings have been posted yet.</p>}
        </Card>
        <Card>
          <ListHeader title="Reports needing attention" subtitle={`${stats.open_reports} open or under review`} action="Review queue" tab="reports" />
          {stats.recent_reports.length ? <ul>{stats.recent_reports.map(report => (
            <li key={report.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"><PrimaryCell title={report.advertisement__title || report.reported_user__email || `Report #${report.id}`} subtitle={`${titleCase(report.reason)} · ${fmtDate(report.created_at)}`} /><span className="ml-auto shrink-0"><StatusPill value={report.status} /></span></li>
          ))}</ul> : <p className="p-4 text-sm text-muted-foreground">No reports are waiting right now.</p>}
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { ask, dialog } = usePromptDialog()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
  function selectTab(next: Tab, nextFilter = '') { setTab(next); setFilter(nextFilter); setSearch(''); setSearchInput(''); setPage(1) }
  function reportError(e: unknown) { setError(messageFromError(e, 'The requested change could not be saved.')) }
  async function changed(message: string) { toast.success(message); setError(''); await load() }

  async function setUserActive(user: Row) {
    const next = !user.is_active
    if (!next && !await ask({ title: 'Suspend this account?', description: <><b>{user.email}</b> won’t be able to sign in until you reactivate them.</>, confirmLabel: 'Suspend account', destructive: true })) return
    try { await api.post(`/admin/users/${user.id}/status/`, { is_active: next }); await changed(next ? 'Account reactivated' : 'Account suspended') } catch (e) { reportError(e) }
  }
  async function verifySeller(seller: Row) {
    try { await api.post(`/admin/sellers/${seller.id}/verification/`, { is_verified: !seller.is_verified }); await changed(seller.is_verified ? 'Seller badge removed' : 'Seller verified') } catch (e) { reportError(e) }
  }
  async function moderateAd(ad: Row, nextStatus: string) {
    let reason = ''
    if (['rejected', 'suspended'].includes(nextStatus)) {
      const values = await ask({
        title: nextStatus === 'rejected' ? 'Reject advertisement' : 'Suspend advertisement',
        description: <>The seller sees this reason on “{ad.title}”.</>,
        fields: [{ name: 'reason', label: 'Reason', required: true, multiline: true, maxLength: 240, placeholder: nextStatus === 'rejected' ? 'e.g. Photos don’t match the item described.' : 'e.g. Reported as a possible scam.' }],
        confirmLabel: nextStatus === 'rejected' ? 'Reject' : 'Suspend', destructive: true,
      })
      if (!values) return
      reason = values.reason
    }
    try { await api.post(`/admin/advertisements/${ad.id}/moderation/`, { status: nextStatus, rejection_reason: reason }); await changed(`Advertisement ${nextStatus === 'active' ? 'approved' : nextStatus}`) } catch (e) { reportError(e) }
  }
  async function toggleActive(endpoint: string, row: Row, label: string) {
    try { await api.patch(`${endpoint}${row.id}/`, { is_active: !row.is_active }); await changed(`${label} ${row.is_active ? 'deactivated' : 'activated'}`) } catch (e) { reportError(e) }
  }
  async function editCategory(category: Row) {
    const values = await ask({ title: 'Edit category', fields: [
      { name: 'name', label: 'Name', defaultValue: category.name, required: true, maxLength: 100 },
      { name: 'description', label: 'Description', defaultValue: category.description || '', multiline: true, maxLength: 240 },
      { name: 'icon', label: 'Icon name', defaultValue: category.icon || '', maxLength: 50, hint: 'A Lucide icon name, e.g. car-front.' },
    ] })
    if (!values) return
    try { await api.patch(`/admin/categories/${category.id}/`, values); await changed('Category updated') } catch (e) { reportError(e) }
  }
  async function rename(endpoint: string, row: Row, label: string) {
    const values = await ask({ title: `Rename ${label.toLowerCase()}`, fields: [{ name: 'name', label: `${label} name`, defaultValue: row.name, required: true, maxLength: 100 }] })
    if (!values) return
    try { await api.patch(`${endpoint}${row.id}/`, { name: values.name }); await changed(`${label} renamed`) } catch (e) { reportError(e) }
  }
  async function reschedulePromotion(promotion: Row) {
    const values = await ask({ title: 'Reschedule promotion', description: promotion.advertisement_title, fields: [{ name: 'ends_at', label: 'New end date and time', type: 'datetime-local', defaultValue: toLocalInput(promotion.ends_at), required: true }] })
    if (!values) return
    try { await api.patch(`/admin/promotions/${promotion.id}/`, { ends_at: new Date(values.ends_at).toISOString() }); await changed('Promotion rescheduled') } catch (e) { reportError(e) }
  }
  async function cancelPromotion(promotion: Row) {
    if (!await ask({ title: 'Cancel this promotion?', description: <>“{promotion.advertisement_title}” will stop being promoted immediately.</>, confirmLabel: 'Cancel promotion', destructive: true })) return
    try { await api.patch(`/admin/promotions/${promotion.id}/`, { status: 'cancelled' }); await changed('Promotion cancelled') } catch (e) { reportError(e) }
  }
  async function updateReport(report: Row, status: string) {
    let resolution_note = ''
    if (status === 'resolved' || status === 'dismissed') {
      const values = await ask({ title: status === 'resolved' ? 'Resolve report' : 'Dismiss report', description: report.target_title || report.target_user_email, fields: [{ name: 'note', label: 'Resolution note', defaultValue: report.resolution_note || '', multiline: true, maxLength: 500, placeholder: 'What was done, for the record.' }], confirmLabel: status === 'resolved' ? 'Resolve' : 'Dismiss' })
      if (!values) return
      resolution_note = values.note
    }
    try { await api.post(`/admin/reports/${report.id}/resolve/`, { status, resolution_note }); await changed(`Report marked ${status}`) } catch (e) { reportError(e) }
  }
  function formHandler(run: (form: FormData) => Promise<unknown>, success: string) {
    return async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const element = event.currentTarget; const form = new FormData(element)
      try { await run(form); element.reset(); await changed(success) } catch (e) { reportError(e) }
    }
  }
  const createCategory = formHandler(form => api.post('/admin/categories/', { name: form.get('name'), description: form.get('description'), icon: form.get('icon') }), 'Category created')
  const createSubcategory = formHandler(form => api.post('/admin/subcategories/', { name: form.get('name'), category: Number(form.get('category')) }), 'Subcategory created')
  const createCounty = formHandler(form => api.post('/admin/counties/', { name: form.get('name') }), 'County created')
  const createTown = formHandler(form => api.post('/admin/towns/', { name: form.get('name'), county: Number(form.get('county')) }), 'Town created')
  const createPromotion = formHandler(form => api.post('/admin/promotions/', { advertisement_slug: form.get('advertisement_slug'), kind: form.get('kind'), status: 'active', ends_at: new Date(String(form.get('ends_at'))).toISOString() }), 'Promotion created. No payment was processed.')

  const filterOptions: Partial<Record<Tab, { value: string; label: string }[]>> = {
    users: [{ value: '', label: 'All accounts' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }],
    sellers: [{ value: '', label: 'All sellers' }, { value: 'true', label: 'Verified' }, { value: 'false', label: 'Unverified' }],
    ads: [{ value: '', label: 'All statuses' }, ...['pending', 'active', 'rejected', 'sold', 'expired', 'suspended'].map(s => ({ value: s, label: titleCase(s) }))],
    locations: [{ value: '', label: 'All counties' }, ...counties.map(county => ({ value: String(county.id), label: county.name }))],
    categories: [{ value: '', label: 'All categories' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    reports: [{ value: '', label: 'All reports' }, ...['open', 'reviewing', 'resolved', 'dismissed'].map(s => ({ value: s, label: titleCase(s) }))],
    promotions: [{ value: '', label: 'All promotions' }, ...['scheduled', 'active', 'ended', 'cancelled'].map(s => ({ value: s, label: titleCase(s) }))],
  }
  const current = tabs.find(item => item.id === tab)!
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const initials = (profile?.first_name?.[0] || profile?.email?.[0] || 'A').toUpperCase()

  const rowButton = (label: string, onClick: () => void, danger = false, disabled = false) => (
    <Button size="sm" variant="outline" disabled={disabled} onClick={onClick} className={cn(danger ? 'border-destructive/50 text-destructive hover:bg-destructive hover:text-white' : 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground dark:text-brand-primary')}>{label}</Button>
  )
  const reviewMenu = (items: { label: string; onSelect: () => void; danger?: boolean }[]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="border-primary/40 text-primary dark:text-brand-primary">Review<ChevronDown /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {items.map((item, index) => [
          item.danger && index > 0 && !items[index - 1].danger ? <DropdownMenuSeparator key={`sep-${item.label}`} /> : null,
          <DropdownMenuItem key={item.label} onSelect={item.onSelect} className={cn(item.danger && 'text-destructive focus:text-destructive')}>{item.label}</DropdownMenuItem>,
        ])}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const inlineForm = (title: string, onSubmit: (event: FormEvent<HTMLFormElement>) => void, fields: ReactNode, button: string, note?: string) => (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="grid gap-3 sm:flex sm:flex-wrap sm:items-end [&>*]:min-w-0">
        <p className="w-full text-sm font-semibold">{title}</p>
        {fields}
        <Button type="submit"><Plus />{button}</Button>
        {note && <p className="w-full text-xs text-muted-foreground">{note}</p>}
      </form>
    </Card>
  )

  function renderSection(): ReactNode {
    if (tab === 'users') return <DataTable rows={rows} empty="New accounts will appear here." columns={[
      { key: 'email', label: 'Account', render: row => <PrimaryCell title={row.email || row.login_phone || 'No contact'} subtitle={[row.first_name, row.last_name].filter(Boolean).join(' ') || 'Name not provided'} /> },
      { key: 'phone_number', label: 'Phone' }, { key: 'joined_at', label: 'Joined', render: row => fmtDate(row.joined_at) },
      { key: 'is_active', label: 'Status', render: row => <StatusPill value={row.is_active ? 'active' : 'suspended'} /> },
      { key: 'action', label: 'Actions', render: row => rowButton(row.is_active ? 'Suspend' : 'Reactivate', () => void setUserActive(row), row.is_active) },
    ]} />
    if (tab === 'sellers') return <DataTable rows={rows} empty="Seller profiles will appear here." columns={[
      { key: 'business_name', label: 'Seller', render: row => <PrimaryCell title={row.business_name || `${row.first_name} ${row.last_name}`} subtitle={row.email} /> },
      { key: 'phone_number', label: 'Phone' }, { key: 'listings_count', label: 'Listings' },
      { key: 'is_active', label: 'Account', render: row => <StatusPill value={row.is_active ? 'active' : 'suspended'} /> },
      { key: 'is_verified', label: 'Verification', render: row => <StatusPill value={row.is_verified ? 'verified' : 'unverified'} /> },
      { key: 'action', label: 'Actions', render: row => rowButton(row.is_verified ? 'Remove badge' : 'Verify seller', () => void verifySeller(row), row.is_verified) },
    ]} />
    if (tab === 'ads') return <DataTable rows={rows} empty="No advertisements match this status." columns={[
      { key: 'title', label: 'Advertisement', render: row => <PrimaryCell title={row.status === 'active' ? <Link to={`/ads/${row.slug}`} className="hover:text-primary hover:underline">{row.title}</Link> : row.title} subtitle={row.seller_email} /> },
      { key: 'category_name', label: 'Category' },
      { key: 'county_name', label: 'Location', render: row => [row.city || row.town_name, row.region || row.county_name, row.country].filter(Boolean).join(', ') },
      { key: 'price', label: 'Price', render: row => <span className="font-semibold text-foreground">{formatCurrencyAmount(Number(row.price), row.currency)}</span> },
      { key: 'status', label: 'Status', render: row => <StatusPill value={row.status} /> },
      { key: 'action', label: 'Review', render: row => reviewMenu([
        { label: 'Approve', onSelect: () => void moderateAd(row, 'active') }, { label: 'Mark expired', onSelect: () => void moderateAd(row, 'expired') },
        { label: 'Reject…', onSelect: () => void moderateAd(row, 'rejected'), danger: true }, { label: 'Suspend…', onSelect: () => void moderateAd(row, 'suspended'), danger: true },
      ]) },
    ]} />
    if (tab === 'categories') return <div className="grid gap-4">
      {inlineForm('Add category', createCategory, <>
        <Input name="name" placeholder="Category name" required maxLength={100} className="sm:w-48" />
        <Input name="description" placeholder="Short description" maxLength={240} className="sm:flex-1" />
        <Input name="icon" placeholder="Icon name (optional)" maxLength={50} className="sm:w-44" />
      </>, 'Add category')}
      {inlineForm('Add subcategory', createSubcategory, <>
        <select name="category" required defaultValue="" className={cn(selectClass, 'sm:w-56')}><option value="" disabled>Choose category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <Input name="name" placeholder="Subcategory name" required maxLength={100} className="sm:flex-1" />
      </>, 'Add subcategory')}
      <Card className="overflow-hidden"><DataTable rows={rows} empty="No categories available." columns={[
        { key: 'name', label: 'Category', render: row => <PrimaryCell title={row.name} subtitle={`${row.subcategories?.length || 0} subcategories`} /> },
        { key: 'description', label: 'Description' }, { key: 'sort_order', label: 'Order' },
        { key: 'is_active', label: 'Status', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> },
        { key: 'actions', label: 'Actions', render: row => <div className="flex justify-end gap-2">{rowButton('Edit', () => void editCategory(row))}{rowButton(row.is_active ? 'Deactivate' : 'Activate', () => void toggleActive('/admin/categories/', row, 'Category'), row.is_active)}</div> },
      ]} /></Card>
      <h3 className="mt-2 font-display text-lg font-bold">Subcategories</h3>
      <Card className="overflow-hidden"><DataTable rows={categories.flatMap(item => (item.subcategories || []).map((sub: Row) => ({ ...sub, category_name: item.name })))} empty="Add subcategories to help sellers describe their listings." columns={[
        { key: 'name', label: 'Subcategory', render: row => <span className="font-semibold text-foreground">{row.name}</span> }, { key: 'category_name', label: 'Category' },
        { key: 'is_active', label: 'Status', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> },
        { key: 'action', label: 'Actions', render: row => <div className="flex justify-end gap-2">{rowButton('Rename', () => void rename('/admin/subcategories/', row, 'Subcategory'))}{rowButton(row.is_active ? 'Deactivate' : 'Activate', () => void toggleActive('/admin/subcategories/', row, 'Subcategory'), row.is_active)}</div> },
      ]} /></Card>
    </div>
    if (tab === 'locations') return <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {inlineForm('Add county', createCounty, <Input name="name" placeholder="County name" required maxLength={80} className="sm:flex-1" />, 'Add county')}
        {inlineForm('Add town', createTown, <>
          <Input name="name" placeholder="Town name" required maxLength={100} className="sm:flex-1" />
          <select name="county" required defaultValue="" className={cn(selectClass, 'sm:w-44')}><option value="" disabled>Choose county</option>{counties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </>, 'Add town')}
      </div>
      <h3 className="mt-2 font-display text-lg font-bold">Counties</h3>
      <Card className="overflow-hidden"><DataTable rows={counties} empty="No counties." columns={[
        { key: 'name', label: 'County', render: row => <span className="font-semibold text-foreground">{row.name}</span> }, { key: 'slug', label: 'URL slug' },
        { key: 'is_active', label: 'Status', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> },
        { key: 'action', label: 'Actions', render: row => <div className="flex justify-end gap-2">{rowButton('Rename', () => void rename('/admin/counties/', row, 'County'))}{rowButton(row.is_active ? 'Deactivate' : 'Activate', () => void toggleActive('/admin/counties/', row, 'County'), row.is_active)}</div> },
      ]} /></Card>
      <h3 className="mt-2 font-display text-lg font-bold">Towns</h3>
      <Card className="overflow-hidden"><DataTable rows={rows} empty="No towns in this county." columns={[
        { key: 'name', label: 'Town', render: row => <span className="font-semibold text-foreground">{row.name}</span> }, { key: 'county_name', label: 'County' }, { key: 'slug', label: 'URL slug' },
        { key: 'is_active', label: 'Status', render: row => <StatusPill value={row.is_active ? 'active' : 'inactive'} /> },
        { key: 'action', label: 'Actions', render: row => <div className="flex justify-end gap-2">{rowButton('Rename', () => void rename('/admin/towns/', row, 'Town'))}{rowButton(row.is_active ? 'Deactivate' : 'Activate', () => void toggleActive('/admin/towns/', row, 'Town'), row.is_active)}</div> },
      ]} /></Card>
    </div>
    if (tab === 'reports') return <DataTable rows={rows} empty="No reports have been submitted." columns={[
      { key: 'id', label: '#' },
      { key: 'target_title', label: 'Listing / account', render: row => <PrimaryCell title={row.target_title || row.target_user_email || 'Unknown target'} subtitle={`Reported by ${row.reporter_email}`} /> },
      { key: 'reason', label: 'Reason', render: row => titleCase(row.reason) },
      { key: 'details', label: 'Details', render: row => <span className="line-clamp-2 max-w-xs">{row.details || '—'}</span> },
      { key: 'status', label: 'Status', render: row => <StatusPill value={row.status} /> },
      { key: 'action', label: 'Review', render: row => reviewMenu([
        { label: 'Mark reviewing', onSelect: () => void updateReport(row, 'reviewing') }, { label: 'Resolve…', onSelect: () => void updateReport(row, 'resolved') },
        { label: 'Dismiss…', onSelect: () => void updateReport(row, 'dismissed'), danger: true },
      ]) },
    ]} />
    if (tab === 'promotions') return <div className="grid gap-4">
      {inlineForm('Schedule a promotion', createPromotion, <>
        <select name="advertisement_slug" required defaultValue="" className={cn(selectClass, 'sm:min-w-64 sm:flex-1')}><option value="" disabled>Choose a live advertisement</option>{activeAds.map(ad => <option key={ad.id} value={ad.slug}>{ad.title} · {ad.seller_email}</option>)}</select>
        <select name="kind" required defaultValue="featured" className={cn(selectClass, 'sm:w-40')}><option value="featured">Featured</option><option value="sponsored">Sponsored</option><option value="top">Top listing</option><option value="urgent">Urgent</option></select>
        <Input name="ends_at" type="datetime-local" required min={new Date().toISOString().slice(0, 16)} className="sm:w-56" aria-label="Promotion ends" />
      </>, 'Schedule', 'No payment is processed by this dashboard.')}
      <Card className="overflow-hidden"><DataTable rows={rows} empty="No promotions are scheduled." columns={[
        { key: 'advertisement_title', label: 'Advertisement', render: row => <PrimaryCell title={row.advertisement_title} subtitle={row.advertisement_slug} /> },
        { key: 'kind', label: 'Placement', render: row => titleCase(row.kind) },
        { key: 'status', label: 'Status', render: row => <StatusPill value={row.status} /> },
        { key: 'starts_at', label: 'Starts', render: row => fmtDate(row.starts_at) }, { key: 'ends_at', label: 'Ends', render: row => fmtDate(row.ends_at) },
        { key: 'action', label: 'Actions', render: row => {
          const finished = row.status === 'cancelled' || row.status === 'ended'
          return <div className="flex justify-end gap-2">{!finished && rowButton('Reschedule', () => void reschedulePromotion(row))}{rowButton('Cancel', () => void cancelPromotion(row), true, finished)}</div>
        } },
      ]} /></Card>
    </div>
    return null
  }

  const tablesInCards = tab === 'categories' || tab === 'locations' || tab === 'promotions'

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="hidden border-r-[3px] border-brand-accent bg-primary text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col dark:bg-card">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5" aria-label={`${SITE_NAME} home`}>
          <LogoMark onBrand />
          <BrandLockup onBlue />
        </Link>
        <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">Administration</p>
        <nav aria-label="Admin sections" className="grid gap-0.5 px-3">
          {tabs.map(item => {
            const Icon = item.icon, selected = tab === item.id
            return (
              <button key={item.id} type="button" onClick={() => selectTab(item.id)} aria-current={selected ? 'page' : undefined}
                className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', selected ? 'bg-white text-primary shadow-sm dark:bg-primary dark:text-white' : 'text-white/85 hover:bg-white/10 hover:text-white')}>
                <Icon className="size-4" aria-hidden="true" /><span className="flex-1 text-left">{item.label}</span>
                {item.id === 'reports' && stats?.open_reports ? <span className="grid min-w-5 place-items-center rounded-full bg-brand-accent px-1.5 text-[11px] text-white">{stats.open_reports}</span> : null}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-white/15 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-9"><AvatarFallback className="bg-white text-primary">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile?.first_name || 'Administrator'}</p><p className="text-xs text-white/70">Staff account</p></div>
          </div>
          <Link to="/account" className="mt-3 block text-xs font-semibold text-white/80 hover:text-white">Account settings</Link>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <Link to="/" className="mr-1 rounded-lg lg:hidden" aria-label={`${SITE_NAME} home`}><LogoMark className="size-8" /></Link>
            <p className="flex min-w-0 items-center gap-1.5 text-sm"><span className="text-muted-foreground">Admin</span><ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" /><b className="truncate">{current.label}</b></p>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><ThemeIcon /></Button>
              <Button asChild variant="outline" size="sm"><Link to="/"><ExternalLink /><span className="max-sm:sr-only">Marketplace</span></Link></Button>
            </div>
          </div>
          {/* Section tabs (phones and tablets) */}
          <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {tabs.map(item => {
              const Icon = item.icon, selected = tab === item.id
              return <button key={item.id} type="button" onClick={() => selectTab(item.id)} aria-current={selected ? 'page' : undefined}
                className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                <Icon className="size-4" aria-hidden="true" />{item.label}
                {item.id === 'reports' && stats?.open_reports ? <span className="grid min-w-5 place-items-center rounded-full bg-brand-accent px-1.5 text-[11px] text-white">{stats.open_reports}</span> : null}
              </button>
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-accent">{SITE_NAME}</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{tab === 'overview' ? 'Marketplace overview' : current.label}</h1>
              <p className="text-sm text-muted-foreground">{sectionDescription[tab]}</p>
            </div>
            {tab !== 'overview' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                {filterOptions[tab] && <select aria-label="Filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} className={cn(selectClass, 'sm:w-44')}>{filterOptions[tab]!.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
                <div className="relative sm:w-60"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={`Search ${current.label.toLowerCase()}…`} aria-label={`Search ${current.label.toLowerCase()}`} className="h-10 pl-9" /></div>
              </div>
            )}
          </div>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {loading ? (
            <div className="grid h-60 place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div>
          ) : tab === 'overview' ? (
            <Overview stats={stats} onSelect={(next, nextFilter) => selectTab(next, nextFilter)} />
          ) : (
            <>
              {tablesInCards ? renderSection() : <Card className="overflow-hidden">{renderSection()}</Card>}
              {tab !== 'categories' && pageInfo.count > 20 && (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{Math.min((page - 1) * 20 + 1, pageInfo.count)}–{Math.min(page * 20, pageInfo.count)} of {pageInfo.count}</span>
                  <div className="flex gap-2"><Button variant="outline" size="sm" disabled={!pageInfo.previous} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={!pageInfo.next} onClick={() => setPage(p => p + 1)}>Next</Button></div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {dialog}
    </div>
  )
}
