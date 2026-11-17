import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import FormField from '../components/FormField'
import MarketLayout from '../components/MarketLayout'
import VerifyEmailNotice from '../components/VerifyEmailNotice'
import { useAuth } from '../lib/auth'
import { marketplaceApi, type Category, type County, type Town } from '../lib/marketplace'
import { requestsApi } from '../lib/requests'
import { messageFromError } from '../utils/errors'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label, Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { COUNTRY_ADJECTIVE, COUNTRY_NAME, LOCAL_CURRENCY, LOCAL_CURRENCY_SYMBOL, SITE_NAME } from '@/config/site'

/** Post "I'm looking for…". */
export default function RequestForm() {
  const { profile, ready } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [countyId, setCountyId] = useState('')
  const [townId, setTownId] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [categories, setCategories] = useState<Category[]>([])
  const [counties, setCounties] = useState<County[]>([])
  const [towns, setTowns] = useState<Town[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    marketplaceApi.categories().then(({ data }) => setCategories(data.results)).catch(() => undefined)
    marketplaceApi.counties().then(({ data }) => setCounties(data.results)).catch(() => undefined)
  }, [])
  const county = counties.find(item => String(item.id) === countyId)
  useEffect(() => {
    if (!county) { setTowns([]); return }
    marketplaceApi.towns(county.slug).then(({ data }) => setTowns(data.results)).catch(() => undefined)
  }, [county])

  if (!ready) return null
  if (!profile) return <Navigate to="/login?next=/requests/new" replace />

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const { data } = await requestsApi.create({
        title, description, currency,
        category_id: categoryId ? Number(categoryId) : null,
        county_id: countyId ? Number(countyId) : null,
        town_id: townId ? Number(townId) : null,
        budget: budget ? budget : null,
      })
      toast.success('Request posted', { description: 'Sellers who can help will message you. We will text or email you when they do.' })
      navigate(`/requests/${data.id}`, { replace: true })
    } catch (e) { setError(messageFromError(e, 'We could not post your request. Check the details and try again.')) }
    finally { setSaving(false) }
  }

  return (
    <MarketLayout eyebrow="Wanted" title="What are you looking for?" subtitle="Describe what you need. Sellers and service providers who can help will message you.">
      <Button asChild variant="ghost" className="-ml-3 mb-3 text-muted-foreground"><Link to="/requests"><ArrowLeft />All requests</Link></Button>
      <div className="mb-4"><VerifyEmailNotice action="post a request" /></div>
      <Card className="p-5 sm:p-6">
        <form className="grid gap-4" onSubmit={submit}>
          {error && <Alert variant="error">{error}</Alert>}
          <FormField label="I am looking for" name="title" maxLength={120} placeholder="Example: 5kVA generator, or a plumber for a kitchen leak" value={title} onChange={e => setTitle(e.target.value)} required />
          <div className="grid gap-2">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea id="description" rows={4} maxLength={2000} placeholder="Size, brand, when you need it, anything that helps sellers offer the right thing." value={description} onChange={e => setDescription(e.target.value)} />
            <p className="text-xs text-muted-foreground">Don&apos;t include your phone number or money details here. People reply in {SITE_NAME} messages.</p>
          </div>
          <div className="grid gap-2"><Label htmlFor="category_id">Category (optional)</Label>
            <Combobox id="category_id" options={categories.map(item => ({ value: String(item.id), label: item.name }))} value={categoryId} onChange={setCategoryId} placeholder="Choose category" searchPlaceholder="Search categories…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="county_id">County</Label>
              <Combobox id="county_id" options={counties.map(item => ({ value: String(item.id), label: item.name }))} value={countyId} onChange={value => { setCountyId(value); setTownId('') }} placeholder={`Anywhere in ${COUNTRY_NAME}`} searchPlaceholder="Search counties…" />
            </div>
            <div className="grid gap-2"><Label htmlFor="town_id">Town</Label>
              <Combobox id="town_id" options={towns.map(item => ({ value: String(item.id), label: item.name }))} value={townId} onChange={setTownId} placeholder={county ? 'Any town' : 'Pick a county first'} searchPlaceholder="Search towns…" disabled={!county} />
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Budget (optional)</span>
            <Segmented label="Budget currency" value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'US$ Dollar' }, { value: LOCAL_CURRENCY, label: `${LOCAL_CURRENCY_SYMBOL} ${COUNTRY_ADJECTIVE}` }]} />
            <FormField label="Up to" name="budget" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Leave empty if open" prefix={currency === LOCAL_CURRENCY ? LOCAL_CURRENCY_SYMBOL : 'US$'} value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={saving || title.trim().length < 3}>{saving ? <><Loader2 className="animate-spin" />Posting…</> : <>Post request<Send /></>}</Button>
          <p className="text-center text-xs text-muted-foreground">Requests stay up for 30 days. You can close yours any time once you find what you need.</p>
        </form>
      </Card>
    </MarketLayout>
  )
}
