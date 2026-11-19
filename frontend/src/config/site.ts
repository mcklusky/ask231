/**
 * Country and brand: the one place to change when launching in another country.
 *
 * The site name is the brand word plus the country calling code: ask + 231 = ask231 (always lowercase).
 * For Ghana you would build with VITE_COUNTRY_CODE=233, VITE_COUNTRY_NAME=Ghana,
 * VITE_COUNTRY_ADJECTIVE=Ghanaian, VITE_COUNTRY_ISO=GH, VITE_CURRENCY=GHS,
 * VITE_CURRENCY_SYMBOL=GH₵ and VITE_CURRENCY_NAME=Ghana cedi (plus that country's regions in the backend).
 * Keep these in step with the backend settings COUNTRY_CALLING_CODE, COUNTRY_NAME,
 * DEFAULT_CURRENCY and BRAND_WORD.
 */
const env = import.meta.env

export const COUNTRY_CODE = env.VITE_COUNTRY_CODE || '231'
export const COUNTRY_NAME = env.VITE_COUNTRY_NAME || 'Liberia'
/** "Liberian" as in "Liberian pride". */
export const COUNTRY_ADJECTIVE = env.VITE_COUNTRY_ADJECTIVE || 'Liberian'
/** Two-letter code for the phone-number picker's default country. */
export const COUNTRY_ISO = env.VITE_COUNTRY_ISO || 'LR'
export const LOCAL_CURRENCY = env.VITE_CURRENCY || 'LRD'
export const LOCAL_CURRENCY_SYMBOL = env.VITE_CURRENCY_SYMBOL || 'L$'
export const LOCAL_CURRENCY_NAME = env.VITE_CURRENCY_NAME || 'Liberian dollar'
export const BRAND_WORD = env.VITE_BRAND_WORD || 'ask'

export const SITE_NAME = `${BRAND_WORD}${COUNTRY_CODE}`
export const TAGLINE = `Buy, sell and ask for anything in ${COUNTRY_NAME}`
