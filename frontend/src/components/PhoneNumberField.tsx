import { useEffect, useState } from 'react'

const callingCodes = [
  ['LR', 'Liberia', '231'], ['US', 'United States', '1'], ['CA', 'Canada', '1'], ['GB', 'United Kingdom', '44'], ['GH', 'Ghana', '233'], ['NG', 'Nigeria', '234'], ['SL', 'Sierra Leone', '232'], ['CI', 'Côte d’Ivoire', '225'], ['GN', 'Guinea', '224'], ['SN', 'Senegal', '221'], ['GM', 'The Gambia', '220'], ['GW', 'Guinea-Bissau', '245'], ['ML', 'Mali', '223'], ['BF', 'Burkina Faso', '226'], ['NE', 'Niger', '227'], ['TG', 'Togo', '228'], ['BJ', 'Benin', '229'], ['CM', 'Cameroon', '237'], ['GA', 'Gabon', '241'], ['CG', 'Republic of the Congo', '242'], ['CD', 'DR Congo', '243'], ['KE', 'Kenya', '254'], ['TZ', 'Tanzania', '255'], ['UG', 'Uganda', '256'], ['RW', 'Rwanda', '250'], ['ZA', 'South Africa', '27'], ['EG', 'Egypt', '20'], ['MA', 'Morocco', '212'], ['DZ', 'Algeria', '213'], ['TN', 'Tunisia', '216'], ['ET', 'Ethiopia', '251'], ['SO', 'Somalia', '252'], ['SD', 'Sudan', '249'], ['SS', 'South Sudan', '211'], ['FR', 'France', '33'], ['DE', 'Germany', '49'], ['IT', 'Italy', '39'], ['ES', 'Spain', '34'], ['PT', 'Portugal', '351'], ['NL', 'Netherlands', '31'], ['BE', 'Belgium', '32'], ['CH', 'Switzerland', '41'], ['AT', 'Austria', '43'], ['SE', 'Sweden', '46'], ['NO', 'Norway', '47'], ['DK', 'Denmark', '45'], ['FI', 'Finland', '358'], ['IE', 'Ireland', '353'], ['PL', 'Poland', '48'], ['RO', 'Romania', '40'], ['GR', 'Greece', '30'], ['TR', 'Türkiye', '90'], ['UA', 'Ukraine', '380'], ['RU', 'Russia', '7'], ['IN', 'India', '91'], ['CN', 'China', '86'], ['JP', 'Japan', '81'], ['KR', 'South Korea', '82'], ['PH', 'Philippines', '63'], ['SG', 'Singapore', '65'], ['MY', 'Malaysia', '60'], ['ID', 'Indonesia', '62'], ['TH', 'Thailand', '66'], ['VN', 'Vietnam', '84'], ['PK', 'Pakistan', '92'], ['BD', 'Bangladesh', '880'], ['AE', 'United Arab Emirates', '971'], ['SA', 'Saudi Arabia', '966'], ['IL', 'Israel', '972'], ['MX', 'Mexico', '52'], ['BR', 'Brazil', '55'], ['AR', 'Argentina', '54'], ['CO', 'Colombia', '57'], ['JM', 'Jamaica', '1876'], ['HT', 'Haiti', '509'], ['AU', 'Australia', '61'], ['NZ', 'New Zealand', '64'], ['FJ', 'Fiji', '679'], ['WS', 'Samoa', '685'], ['PG', 'Papua New Guinea', '675'],
] as const

type Props = { label: string; name: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; autoComplete?: string; placeholder?: string }

function codeFromNumber(value: string) {
  if (!value.startsWith('+')) return null
  const digits = value.slice(1).replace(/\D/g, '')
  return [...callingCodes].sort((a, b) => b[2].length - a[2].length).find(([, , code]) => digits.startsWith(code))?.[2] || null
}

export default function PhoneNumberField({ label, name, value, onChange, hint, required, autoComplete = 'tel', placeholder = 'Phone number' }: Props) {
  const [selectedCode, setSelectedCode] = useState<string>(codeFromNumber(value) || '231')
  const [customCode, setCustomCode] = useState(() => value.match(/^\+(\d{1,4})/)?.[1] || '')
  useEffect(() => {
    const detected = codeFromNumber(value)
    if (detected) setSelectedCode(detected)
    else if (value.startsWith('+')) setSelectedCode('other')
    if (value.startsWith('+') && !detected) setCustomCode(value.match(/^\+(\d{1,4})/)?.[1] || '')
  }, [value])

  const dialCode = selectedCode === 'other' ? customCode : selectedCode
  const prefix = dialCode ? `+${dialCode}` : ''
  const nationalValue = value.startsWith(prefix) && prefix ? value.slice(prefix.length).trimStart() : value.replace(/^\+\d{1,4}\s*/, '')
  const saveNumber = (national: string, code = dialCode) => onChange(national.trim() ? `${code ? `+${code} ` : ''}${national}` : '')

  return <div className="field phone-number-field">
    <label htmlFor={name}>{label}</label>
    <div className="phone-input-shell">
      <select aria-label="Country calling code" value={selectedCode} onChange={event => {
        const nextCode = event.target.value
        setSelectedCode(nextCode)
        if (nextCode !== 'other') saveNumber(nationalValue, nextCode)
      }}>
        {callingCodes.map(([country, countryName, code]) => <option key={country} value={code}>{countryName} (+{code})</option>)}
        <option value="other">Other country code</option>
      </select>
      {selectedCode === 'other' && <label className="phone-custom-code"><span className="sr-only">Calling code</span><b>+</b><input aria-label="Enter country calling code" inputMode="numeric" maxLength={4} placeholder="Code" value={customCode} onChange={event => {
        const nextCode = event.target.value.replace(/\D/g, '').slice(0, 4)
        setCustomCode(nextCode)
        saveNumber(nationalValue, nextCode)
      }} /></label>}
      <input id={name} name={name} type="tel" autoComplete={autoComplete} inputMode="tel" placeholder={placeholder} value={nationalValue} required={required} onChange={event => {
        const typed = event.target.value
        if (typed.startsWith('+')) {
          const detected = codeFromNumber(typed)
          if (!detected) setSelectedCode('other')
          onChange(typed)
        } else saveNumber(typed)
      }} />
    </div>
    {hint && <small className="field-hint">{hint}</small>}
  </div>
}
