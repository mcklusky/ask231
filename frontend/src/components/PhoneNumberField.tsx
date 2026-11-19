import { COUNTRY_ISO } from '@/config/site'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { COUNTRIES as callingCodes } from '@/lib/countries'

const codeFor = (country: string) => callingCodes.find(([iso]) => iso === country)?.[2] ?? ''

/** Country (ISO) whose calling code starts the number; longest code wins, and shared codes keep the current pick. */
function countryFromNumber(value: string, current?: string) {
  if (!value.startsWith('+')) return null
  const digits = value.slice(1).replace(/\D/g, '')
  const match = [...callingCodes].sort((a, b) => b[2].length - a[2].length).find(([, , code]) => digits.startsWith(code))
  if (!match) return null
  if (current && codeFor(current) === match[2]) return current
  return match[0]
}

type Props = { label: string; name: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; autoComplete?: string; placeholder?: string }

/** Phone number with a searchable country-code picker (Liberia +231 by default). Emits "+231 770 123 456". */
export default function PhoneNumberField({ label, name, value, onChange, hint, required, autoComplete = 'tel', placeholder = 'Phone number' }: Props) {
  const [country, setCountry] = useState<string>(() => countryFromNumber(value) || (value.startsWith('+') ? 'other' : COUNTRY_ISO))
  const [customCode, setCustomCode] = useState(() => value.match(/^\+(\d{1,4})/)?.[1] || '')
  useEffect(() => {
    if (!value.startsWith('+')) return
    setCountry(current => {
      const detected = countryFromNumber(value, current === 'other' ? undefined : current)
      if (detected) return detected
      setCustomCode(value.match(/^\+(\d{1,4})/)?.[1] || '')
      return 'other'
    })
  }, [value])

  const options = useMemo<ComboboxOption[]>(() => [
    ...callingCodes.map(([iso, countryName, code]) => ({ value: iso, label: `${countryName} (+${code})`, keywords: [iso, code, `+${code}`] })),
    { value: 'other', label: 'Other country code', keywords: ['other', 'custom'] },
  ], [])

  const dialCode = country === 'other' ? customCode : codeFor(country)
  const prefix = dialCode ? `+${dialCode}` : ''
  const nationalValue = prefix && value.startsWith(prefix) ? value.slice(prefix.length).trimStart() : value.replace(/^\+\d{1,4}\s*/, '')
  const saveNumber = (national: string, code = dialCode) => onChange(national.trim() ? `${code ? `+${code} ` : ''}${national}` : '')

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-2 max-[380px]:grid-cols-1">
        <Combobox
          aria-label={`${label}: country code`}
          options={options}
          value={country}
          onChange={next => { setCountry(next); if (next !== 'other') saveNumber(nationalValue, codeFor(next)) }}
          searchPlaceholder="Search country or code…"
        />
        <div className="flex gap-2">
          {country === 'other' && (
            <div className="relative w-24 shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">+</span>
              <Input aria-label="Country calling code" inputMode="numeric" maxLength={4} placeholder="Code" className="pl-6" value={customCode}
                onChange={event => { const next = event.target.value.replace(/\D/g, '').slice(0, 4); setCustomCode(next); saveNumber(nationalValue, next) }} />
            </div>
          )}
          <Input id={name} name={name} type="tel" autoComplete={autoComplete} inputMode="tel" placeholder={placeholder} value={nationalValue} required={required}
            className={cn('min-w-0 flex-1')}
            onChange={event => {
              const typed = event.target.value
              if (typed.startsWith('+')) { if (!countryFromNumber(typed)) setCountry('other'); onChange(typed) }
              else saveNumber(typed)
            }} />
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
