import { api } from './api'
import { COUNTRIES } from './countries'

/** Daily rates from our server: units of each currency per US$1. */
export type ExchangeRates = { base: 'USD'; rates: Record<string, number>; updated_at: string; source: { name: string; url: string } }

let cached: Promise<ExchangeRates> | null = null
/** Fetched once per visit; a failure is not cached, so the next try asks again. */
export function loadExchangeRates() {
  if (!cached) cached = api.get<ExchangeRates>('/market/exchange-rates/').then(({ data }) => data).catch(error => { cached = null; throw error })
  return cached
}

/** The currency each country in our list uses (ISO country code -> ISO currency code). */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  LR: 'LRD', US: 'USD', CA: 'CAD', GB: 'GBP', GH: 'GHS', NG: 'NGN', SL: 'SLE', CI: 'XOF', GN: 'GNF', SN: 'XOF', GM: 'GMD', GW: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', CD: 'CDF', KE: 'KES', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ZA: 'ZAR', EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', ET: 'ETB', SO: 'SOS', SD: 'SDG', SS: 'SSP',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', IE: 'EUR', GR: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', RO: 'RON',
  TR: 'TRY', UA: 'UAH', RU: 'RUB', IN: 'INR', CN: 'CNY', JP: 'JPY', KR: 'KRW', PH: 'PHP', SG: 'SGD', MY: 'MYR', ID: 'IDR', TH: 'THB', VN: 'VND', PK: 'PKR', BD: 'BDT', AE: 'AED', SA: 'SAR',
  IL: 'ILS', MX: 'MXN', BR: 'BRL', AR: 'ARS', CO: 'COP', JM: 'JMD', HT: 'HTG', AU: 'AUD', NZ: 'NZD', FJ: 'FJD', WS: 'WST', PG: 'PGK',
}

/** "Ghana" -> "GHS"; US$ when the country isn't known. */
export function currencyForCountryName(name: string) {
  const match = COUNTRIES.find(([, countryName]) => countryName.toLowerCase() === name.trim().toLowerCase())
  return (match && CURRENCY_BY_COUNTRY[match[0]]) || 'USD'
}

/** "GHS" -> "Ghanaian Cedi" (the browser's own names), falling back to the code. */
export function currencyName(code: string) {
  try { return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code } catch { return code }
}

/** Convert through US$. Whole numbers for the local currency (no one prices in cents), cents for US$. */
export function convertPrice(amount: number, from: string, to: string, rates: Record<string, number>, wholeNumbers = false) {
  const fromRate = rates[from], toRate = rates[to]
  if (!fromRate || !toRate || !Number.isFinite(amount) || amount <= 0) return null
  const value = (amount / fromRate) * toRate
  return wholeNumbers ? Math.max(1, Math.round(value)) : Math.max(0.01, Math.round(value * 100) / 100)
}
