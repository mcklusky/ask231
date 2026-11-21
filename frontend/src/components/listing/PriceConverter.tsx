import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import FormField from '../FormField'
import { convertPrice, currencyForCountryName, currencyName, loadExchangeRates, type ExchangeRates } from '@/lib/currency'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/input'
import { COUNTRY_NAME, LOCAL_CURRENCY, LOCAL_CURRENCY_SYMBOL } from '@/config/site'

function money(amount: number, code: string) {
  // The site's own symbols for the two currencies ads are priced in; the browser's format for the rest.
  if (code === LOCAL_CURRENCY || code === 'USD') return `${code === 'USD' ? 'US$' : LOCAL_CURRENCY_SYMBOL}${amount.toLocaleString('en', { maximumFractionDigits: code === 'USD' ? 2 : 0 })}`
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: code === LOCAL_CURRENCY ? 0 : 2 }).format(amount) } catch { return `${code} ${amount.toLocaleString('en')}` }
}

/**
 * "Price in another currency?" Sellers type their price in their own money (e.g. Ghana cedis) and the
 * ad's price is filled in, converted to the currency picked above (US$ or the local currency), as they type.
 * Opens by itself for sellers outside the site's country.
 */
/** The seller's own currency, or the other of US$ / local when theirs is the one the ad is priced in. */
function startingCurrency(country: string, target: string) {
  const own = currencyForCountryName(country)
  return own !== target ? own : target === 'USD' ? LOCAL_CURRENCY : 'USD'
}

export default function PriceConverter({ country, target, onPrice }: { country: string; target: string; onPrice: (price: string) => void }) {
  const abroad = country.trim().toLowerCase() !== COUNTRY_NAME.toLowerCase()
  const [open, setOpen] = useState(abroad)
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [error, setError] = useState('')
  const [from, setFrom] = useState(() => startingCurrency(country, target))
  const [amount, setAmount] = useState('')
  const pickedByHand = useRef(false)

  // Follow the seller's country until they choose a currency themselves.
  useEffect(() => { if (!pickedByHand.current) setFrom(startingCurrency(country, target)) }, [country, target])
  useEffect(() => { if (abroad) setOpen(true) }, [abroad])
  useEffect(() => {
    if (!open || rates) return
    loadExchangeRates().then(setRates).catch(() => setError('Currency rates are not available right now. Enter your price in US$ or the local currency above.'))
  }, [open, rates])

  const converted = useMemo(() => rates ? convertPrice(Number(amount), from, target, rates.rates, target === LOCAL_CURRENCY) : null, [amount, from, target, rates])
  const onPriceRef = useRef(onPrice); onPriceRef.current = onPrice
  useEffect(() => { if (converted !== null) onPriceRef.current(String(converted)) }, [converted])

  const options = useMemo(() => Object.keys(rates?.rates || { [from]: 1 }).sort().map(code => ({ value: code, label: `${code} · ${currencyName(code)}` })), [rates, from])

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline dark:text-brand-primary"><ArrowRightLeft className="size-4" aria-hidden="true" />Price in another currency? Convert it</button>

  return (
    <div className="grid gap-3 rounded-lg border border-primary/25 bg-secondary/60 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold"><ArrowRightLeft className="size-4 text-primary dark:text-brand-primary" aria-hidden="true" />Convert from your currency</p>
        <p className="text-xs text-muted-foreground">Type your price in your own money. We convert it to {target === 'USD' ? 'US dollars' : currencyName(target)} so buyers in {COUNTRY_NAME} understand it.</p>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : <>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="convert_from">Your currency</Label>
            <Combobox id="convert_from" options={options} value={from} onChange={value => { pickedByHand.current = true; setFrom(value || 'USD') }} placeholder="Currency" searchPlaceholder="Search currencies…" disabled={!rates} />
          </div>
          <FormField label={`Your price in ${from}`} name="convert_amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0" prefix={from} value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <p className="text-sm" role="status" aria-live="polite">
          {!rates ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Getting today's rates…</span>
            : converted !== null ? <>{money(Number(amount), from)} = <b>{money(converted, target)}</b>. The price above is filled in for you.</>
            : <span className="text-muted-foreground">1 {from} ≈ {money(rates.rates[target] / (rates.rates[from] || 1), target)}</span>}
        </p>
        {rates && <p className="text-[11px] text-muted-foreground">Rates by <a href={rates.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{rates.source.name}</a>, updated daily. Prices are approximate.</p>}
      </>}
    </div>
  )
}
