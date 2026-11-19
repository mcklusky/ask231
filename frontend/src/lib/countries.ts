/**
 * Countries people sell from or call from: [ISO code, name, calling code].
 * Common countries first; the rest follow in rough regional order.
 */
export const COUNTRIES = [
  ['LR', 'Liberia', '231'], ['US', 'United States', '1'], ['CA', 'Canada', '1'], ['GB', 'United Kingdom', '44'], ['GH', 'Ghana', '233'], ['NG', 'Nigeria', '234'], ['SL', 'Sierra Leone', '232'], ['CI', 'Côte d’Ivoire', '225'], ['GN', 'Guinea', '224'], ['SN', 'Senegal', '221'], ['GM', 'The Gambia', '220'], ['GW', 'Guinea-Bissau', '245'], ['ML', 'Mali', '223'], ['BF', 'Burkina Faso', '226'], ['NE', 'Niger', '227'], ['TG', 'Togo', '228'], ['BJ', 'Benin', '229'], ['CM', 'Cameroon', '237'], ['GA', 'Gabon', '241'], ['CG', 'Republic of the Congo', '242'], ['CD', 'DR Congo', '243'], ['KE', 'Kenya', '254'], ['TZ', 'Tanzania', '255'], ['UG', 'Uganda', '256'], ['RW', 'Rwanda', '250'], ['ZA', 'South Africa', '27'], ['EG', 'Egypt', '20'], ['MA', 'Morocco', '212'], ['DZ', 'Algeria', '213'], ['TN', 'Tunisia', '216'], ['ET', 'Ethiopia', '251'], ['SO', 'Somalia', '252'], ['SD', 'Sudan', '249'], ['SS', 'South Sudan', '211'], ['FR', 'France', '33'], ['DE', 'Germany', '49'], ['IT', 'Italy', '39'], ['ES', 'Spain', '34'], ['PT', 'Portugal', '351'], ['NL', 'Netherlands', '31'], ['BE', 'Belgium', '32'], ['CH', 'Switzerland', '41'], ['AT', 'Austria', '43'], ['SE', 'Sweden', '46'], ['NO', 'Norway', '47'], ['DK', 'Denmark', '45'], ['FI', 'Finland', '358'], ['IE', 'Ireland', '353'], ['PL', 'Poland', '48'], ['RO', 'Romania', '40'], ['GR', 'Greece', '30'], ['TR', 'Türkiye', '90'], ['UA', 'Ukraine', '380'], ['RU', 'Russia', '7'], ['IN', 'India', '91'], ['CN', 'China', '86'], ['JP', 'Japan', '81'], ['KR', 'South Korea', '82'], ['PH', 'Philippines', '63'], ['SG', 'Singapore', '65'], ['MY', 'Malaysia', '60'], ['ID', 'Indonesia', '62'], ['TH', 'Thailand', '66'], ['VN', 'Vietnam', '84'], ['PK', 'Pakistan', '92'], ['BD', 'Bangladesh', '880'], ['AE', 'United Arab Emirates', '971'], ['SA', 'Saudi Arabia', '966'], ['IL', 'Israel', '972'], ['MX', 'Mexico', '52'], ['BR', 'Brazil', '55'], ['AR', 'Argentina', '54'], ['CO', 'Colombia', '57'], ['JM', 'Jamaica', '1876'], ['HT', 'Haiti', '509'], ['AU', 'Australia', '61'], ['NZ', 'New Zealand', '64'], ['FJ', 'Fiji', '679'], ['WS', 'Samoa', '685'], ['PG', 'Papua New Guinea', '675'],
] as const

export type CountryIso = (typeof COUNTRIES)[number][0]

/** The flag emoji for an ISO code, e.g. "GH" -> 🇬🇭 (built from regional indicator letters). */
export function countryFlag(iso: string) {
  return /^[A-Za-z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : ''
}

/** Flag for a country stored by name (listings keep the name, e.g. "Ghana"); empty when the name is not in the list. */
export function flagForCountryName(name: string) {
  const match = COUNTRIES.find(([, countryName]) => countryName.toLowerCase() === name.trim().toLowerCase())
  return match ? countryFlag(match[0]) : ''
}

/** Country names sorted A–Z, for pickers. */
export const COUNTRY_NAMES_SORTED = [...COUNTRIES].map(([, name]) => name).sort((a, b) => a.localeCompare(b))
