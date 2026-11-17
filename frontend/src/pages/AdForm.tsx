import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, Send, X } from 'lucide-react'
import FormField from '../components/FormField'
import PhoneNumberField from '../components/PhoneNumberField'
import MarketLayout from '../components/MarketLayout'
import VerifyEmailNotice from '../components/VerifyEmailNotice'
import { api } from '../lib/api'
import { type Advertisement, type Category, type County, type Town, marketplaceApi } from '../lib/marketplace'
import { messageFromError } from '../utils/errors'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label, Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'

type FormState = { title: string; description: string; price: string; currency: string; condition: 'new' | 'used'; phone_number: string; whatsapp_number: string; country: string; region: string; city: string; category_id: string; subcategory_id: string; county_id: string; town_id: string }
const initial: FormState = { title: '', description: '', price: '', currency: 'LRD', condition: 'used', phone_number: '', whatsapp_number: '', country: 'Liberia', region: '', city: '', category_id: '', subcategory_id: '', county_id: '', town_id: '' }
const MAX_PHOTOS = 10
const MAX_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function Step({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-extrabold text-primary-foreground">{number}</span>
        <div><h2 className="font-display text-lg font-bold leading-tight">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div>
      </div>
      <div className="grid gap-5">{children}</div>
    </Card>
  )
}

export default function AdForm() {
  const { slug } = useParams(); const editing = Boolean(slug); const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(initial)
  const [categories, setCategories] = useState<Category[]>([]); const [counties, setCounties] = useState<County[]>([]); const [towns, setTowns] = useState<Town[]>([])
  const [existing, setExisting] = useState<Advertisement['images']>([]); const [removeIds, setRemoveIds] = useState<number[]>([]); const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [tried, setTried] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const category = useMemo(() => categories.find(item => String(item.id) === form.category_id), [categories, form.category_id])
  const county = useMemo(() => counties.find(item => String(item.id) === form.county_id), [counties, form.county_id])
  const inLiberia = form.country.trim().toLowerCase() === 'liberia'
  const currencyMode = form.currency === 'LRD' || form.currency === 'USD' ? form.currency : 'OTHER'

  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      try {
        const [categoryResponse, countyResponse, adResponse] = await Promise.all([marketplaceApi.categories(), marketplaceApi.counties(), slug ? api.get<Advertisement>(`/market/advertisements/${slug}/`) : Promise.resolve(null)])
        if (!mounted) return
        setCategories(categoryResponse.data.results); setCounties(countyResponse.data.results)
        if (adResponse) {
          const ad = adResponse.data
          setForm({ title: ad.title, description: ad.description, price: ad.price, currency: ad.currency, condition: ad.condition, phone_number: ad.phone_number, whatsapp_number: ad.whatsapp_number, country: ad.country || 'Liberia', region: ad.region || '', city: ad.city || '', category_id: String(ad.category.id), subcategory_id: String(ad.subcategory.id), county_id: ad.county ? String(ad.county.id) : '', town_id: ad.town ? String(ad.town.id) : '' })
          setExisting(ad.images)
        }
      } catch (e) { if (mounted) setError(messageFromError(e, 'Could not load the form. Sign in and try again.')) }
      finally { if (mounted) setLoading(false) }
    }
    void init()
    return () => { mounted = false }
  }, [slug])

  useEffect(() => {
    let mounted = true
    if (!county) { setTowns([]); return () => { mounted = false } }
    marketplaceApi.towns(county.slug).then(({ data }) => { if (mounted) setTowns(data.results) }).catch(e => { if (mounted) setError(messageFromError(e, 'Could not load towns for this county.')) })
    return () => { mounted = false }
  }, [county])

  // One preview URL per selected file, released when the file is removed or the page closes.
  const previews = useMemo(() => files.map(file => URL.createObjectURL(file)), [files])
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(current => ({ ...current, [key]: value })) }

  const keptExisting = existing.filter(image => !removeIds.includes(image.id))
  const photoCount = keptExisting.length + files.length

  function addFiles(list: FileList | File[] | null) {
    if (!list) return
    const incoming = Array.from(list)
    const rejected = incoming.filter(file => !PHOTO_TYPES.includes(file.type) || file.size > MAX_BYTES)
    const accepted = incoming.filter(file => !rejected.includes(file))
    const room = MAX_PHOTOS - photoCount
    const problems: string[] = []
    if (rejected.length) problems.push(`${rejected.length} photo${rejected.length > 1 ? 's were' : ' was'} skipped (use JPG, PNG or WebP under 5 MB).`)
    if (accepted.length > room) problems.push(`You can add up to ${MAX_PHOTOS} photos, so only ${Math.max(room, 0)} more were added.`)
    setError(problems.join(' '))
    if (room > 0) setFiles(current => [...current, ...accepted.slice(0, room)])
  }
  function onDrop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }

  const missing = [
    !form.category_id && 'category',
    !form.subcategory_id && 'subcategory',
    inLiberia && !form.county_id && 'county',
    inLiberia && !form.town_id && 'town',
    !form.phone_number.trim() && 'phone number',
  ].filter(Boolean) as string[]

  async function submit(event: FormEvent) {
    event.preventDefault(); setTried(true)
    if (missing.length) { setError(`Please choose a ${missing.join(', ')}.`); return }
    setSaving(true); setError('')
    const body = new FormData()
    ;(Object.entries(form) as [keyof FormState, string][]).forEach(([key, value]) => { if (value || !['county_id', 'town_id'].includes(key)) body.append(key, value) })
    files.forEach(file => body.append('image_uploads', file))
    try {
      const response = editing && slug ? await marketplaceApi.update(slug, body) : await marketplaceApi.create(body)
      for (const id of removeIds) await marketplaceApi.removeImage(response.data.slug, id)
      navigate('/my-ads', { state: { notice: editing ? 'Your advertisement was updated and sent for review.' : 'Your advertisement was submitted for review.' } })
    } catch (e) { setError(messageFromError(e, 'Could not save your advertisement. Check the form and try again.')) }
    finally { setSaving(false) }
  }

  const title = editing ? 'Edit advertisement' : 'Post an advertisement'
  if (loading) return <MarketLayout title={title} subtitle="Loading the listing form."><div className="grid h-48 place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" /></div></MarketLayout>

  return (
    <MarketLayout title={title} subtitle={editing ? 'Update the details of your listing.' : 'Tell buyers what you are selling. It takes about two minutes.'}>
      <Button asChild variant="ghost" className="-ml-3 mb-3 text-muted-foreground"><Link to="/my-ads"><ArrowLeft />Back to my ads</Link></Button>
      {!editing && <div className="mb-4"><VerifyEmailNotice action="post your ad" /></div>}
      <form className="grid gap-4" onSubmit={submit} noValidate={false}>
        <Step number="1" title="What are you selling?" description="A clear title and the right category help buyers find you.">
          <FormField label="Title" name="title" maxLength={140} placeholder="Example: Toyota Corolla 2018, excellent condition" value={form.title} onChange={e => update('title', e.target.value)} required hint={`${form.title.length}/140 characters`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="category_id">Category</Label>
              <Combobox id="category_id" options={categories.map(item => ({ value: String(item.id), label: item.name }))} value={form.category_id} onChange={value => { update('category_id', value); update('subcategory_id', '') }} placeholder="Choose category" searchPlaceholder="Search categories…" invalid={tried && !form.category_id} />
            </div>
            <div className="grid gap-2"><Label htmlFor="subcategory_id">Subcategory</Label>
              <Combobox id="subcategory_id" options={(category?.subcategories ?? []).map(item => ({ value: String(item.id), label: item.name }))} value={form.subcategory_id} onChange={value => update('subcategory_id', value)} placeholder={category ? 'Choose subcategory' : 'Pick a category first'} searchPlaceholder="Search subcategories…" disabled={!category} invalid={tried && !!category && !form.subcategory_id} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" maxLength={10000} rows={6} placeholder="Condition, size, age, what’s included, and anything buyers should know." value={form.description} onChange={e => update('description', e.target.value)} required />
            <p className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Be clear and honest. Never include bank or mobile money details. <Link to="/terms#prohibited" target="_blank" className="font-medium text-primary underline underline-offset-2 dark:text-brand-blue">Listing rules</Link></span><span className="shrink-0">{form.description.length}/10,000</span></p>
          </div>
        </Step>

        <Step number="2" title="Price and condition" description="Pick the currency buyers will pay in.">
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Currency</span>
            <Segmented label="Currency" value={currencyMode} onChange={mode => update('currency', mode === 'OTHER' ? '' : mode)} options={[{ value: 'LRD', label: 'L$ Liberian' }, { value: 'USD', label: 'US$ Dollar' }, { value: 'OTHER', label: 'Other' }]} />
          </div>
          <div className={cn('grid gap-4', currencyMode === 'OTHER' && 'sm:grid-cols-[1fr_10rem]')}>
            <FormField label="Price" name="price" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0" prefix={currencyMode === 'LRD' ? 'L$' : currencyMode === 'USD' ? 'US$' : form.currency || '···'} value={form.price} onChange={e => update('price', e.target.value)} required />
            {currencyMode === 'OTHER' && <FormField label="Currency code" name="currency" maxLength={3} pattern="[A-Za-z]{3}" placeholder="EUR" value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} hint="3 letters, e.g. EUR" required />}
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Condition</span>
            <Segmented label="Condition" value={form.condition} onChange={value => update('condition', value as FormState['condition'])} options={[{ value: 'new', label: 'New' }, { value: 'used', label: 'Used' }]} />
          </div>
        </Step>

        <Step number="3" title="Where can buyers find you?" description="Location and contact numbers are shown on your ad.">
          <FormField label="Country" name="country" autoComplete="country-name" placeholder="Liberia" value={form.country} onChange={e => { update('country', e.target.value); update('county_id', ''); update('town_id', '') }} required />
          {inLiberia ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="county_id">County</Label>
                <Combobox id="county_id" options={counties.map(item => ({ value: String(item.id), label: item.name }))} value={form.county_id} onChange={value => { update('county_id', value); update('town_id', '') }} placeholder="Choose county" searchPlaceholder="Search counties…" invalid={tried && !form.county_id} />
              </div>
              <div className="grid gap-2"><Label htmlFor="town_id">Town</Label>
                <Combobox id="town_id" options={towns.map(item => ({ value: String(item.id), label: item.name }))} value={form.town_id} onChange={value => update('town_id', value)} placeholder={county ? 'Choose town' : 'Pick a county first'} searchPlaceholder="Search towns…" disabled={!county} invalid={tried && !!county && !form.town_id} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City or town" name="city" placeholder="City or town" value={form.city} onChange={e => update('city', e.target.value)} required />
              <FormField label="State, province, or region" name="region" placeholder="Optional" value={form.region} onChange={e => update('region', e.target.value)} />
            </div>
          )}
          <PhoneNumberField label="Phone number" name="phone_number" value={form.phone_number} onChange={value => update('phone_number', value)} required />
          <div className="grid gap-1.5">
            <PhoneNumberField label="WhatsApp number (optional)" name="whatsapp_number" value={form.whatsapp_number} onChange={value => update('whatsapp_number', value)} />
            {form.phone_number && form.whatsapp_number !== form.phone_number && (
              <Button type="button" variant="link" size="sm" className="h-auto justify-self-start px-0" onClick={() => update('whatsapp_number', form.phone_number)}>Use my phone number for WhatsApp</Button>
            )}
          </div>
        </Step>

        <Step number="4" title="Add photos" description="Ads with clear photos get far more messages. The first photo is the cover.">
          <label
            onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring', dragging ? 'border-primary bg-secondary' : 'border-input hover:border-primary/60 hover:bg-muted/50', photoCount >= MAX_PHOTOS && 'pointer-events-none opacity-60')}>
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><ImagePlus className="size-6" aria-hidden="true" /></span>
            <span className="font-semibold">Drag photos here or <span className="text-primary underline underline-offset-2 dark:text-brand-blue">choose from your device</span></span>
            <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB each · {photoCount}/{MAX_PHOTOS} added</span>
            <input ref={fileInput} type="file" accept={PHOTO_TYPES.join(',')} multiple className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = '' }} disabled={photoCount >= MAX_PHOTOS} />
          </label>
          {photoCount > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Selected photos">
              {[...keptExisting.map(image => ({ key: `e${image.id}`, src: image.thumbnail_url || image.image_url, alt: image.alt_text || 'Photo', remove: () => setRemoveIds(ids => [...ids, image.id]) })),
                ...files.map((file, index) => ({ key: `f${index}-${file.name}`, src: previews[index], alt: file.name, remove: () => setFiles(current => current.filter((_, i) => i !== index)) }))]
                .map((photo, index) => (
                  <li key={photo.key} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
                    {index === 0 && <Badge variant="red" className="absolute bottom-1.5 left-1.5">Cover</Badge>}
                    <button type="button" onClick={photo.remove} aria-label={`Remove photo ${index + 1}`} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Step>

        {error && <Alert variant="error">{error}</Alert>}
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:text-sm">Your ad is reviewed by our team before it goes live.</p>
          <Button type="submit" variant="cta" size="lg" className="w-full sm:w-auto" disabled={saving}>{saving ? <><Loader2 className="animate-spin" />Saving…</> : <><Send />{editing ? 'Save changes' : 'Submit for review'}</>}</Button>
        </div>
      </form>
    </MarketLayout>
  )
}
