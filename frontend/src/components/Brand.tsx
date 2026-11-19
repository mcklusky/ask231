import { cn } from '@/lib/utils'
import { BRAND_WORD, COUNTRY_CODE, COUNTRY_NAME } from '@/config/site'

const LOGO_FONT = 'Poppins, sans-serif'
// Fixed logo colours (same as the app icons in scripts/app-icon/icon.html), so the mark looks the same in light and dark mode.
const LOGO_PRIMARY = '#0f5c5c'
const LOGO_PRIMARY_DARK = '#0a4343'
const LOGO_ACCENT = '#b85a24'

/**
 * The shopping-bag logo mark, drawn from the same artwork as the app icon (without the name, which is unreadable this small).
 * On the teal header and sidebars (`onBrand`) the bag stands on its own; elsewhere it sits on a teal tile like the app icon.
 */
export function LogoMark({ onBrand = false, className }: { onBrand?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn('size-9 shrink-0', className)} aria-hidden="true" focusable="false">
      {!onBrand && <rect width="512" height="512" rx="116" fill={LOGO_PRIMARY} />}
      <g transform={onBrand ? 'translate(-64 -83) scale(1.25)' : 'translate(56 45) scale(0.78)'}>
        <path d="M164 186 V160 a92 80 0 0 1 184 0 V186" fill="none" stroke="#ffffff" strokeWidth="30" strokeLinecap="round" />
        <path d="M110 186 H402 L424 436 a24 24 0 0 1 -24 26 H112 a24 24 0 0 1 -24 -26 Z" fill={LOGO_PRIMARY_DARK} transform="translate(0 10)" opacity="0.55" />
        <path d="M110 176 H402 L424 426 a24 24 0 0 1 -24 26 H112 a24 24 0 0 1 -24 -26 Z" fill="#ffffff" />
        <path d="M110 176 H402 L406 222 H106 Z" fill={LOGO_ACCENT} />
        <circle cx="164" cy="199" r="9" fill="#ffffff" />
        <circle cx="348" cy="199" r="9" fill="#ffffff" />
      </g>
    </svg>
  )
}

/**
 * The wordmark, e.g. "ask231": lowercase Poppins, no backgrounds, the brand word in the text colour
 * and the country code in the accent colour (a lighter tint on the teal header so it stays readable).
 * `onBlue` is for the teal header and dark sidebars; otherwise it sits on white or card backgrounds.
 */
export function BrandName({ onBlue = false, className }: { onBlue?: boolean; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center leading-none tracking-tight', onBlue ? 'text-white' : 'text-brand-primary dark:text-foreground', className)}
      style={{ fontFamily: LOGO_FONT, fontWeight: 500 }}
    >
      {BRAND_WORD.toLowerCase()}
      <span className={onBlue ? 'text-[#f7a072]' : 'text-brand-accent'}>{COUNTRY_CODE}</span>
    </span>
  )
}

/** Wordmark with the country name underneath, used next to the logo icon. */
export function BrandLockup({ onBlue = false, hideCountryOnTiny = false }: { onBlue?: boolean; hideCountryOnTiny?: boolean }) {
  return (
    <span className="leading-none">
      <BrandName onBlue={onBlue} className="text-[17px]" />
      <span className={cn('mt-1 block font-display text-[10px] font-bold uppercase tracking-[0.2em]', onBlue ? 'text-white/75' : 'text-muted-foreground', hideCountryOnTiny && 'max-[359px]:hidden')}>{COUNTRY_NAME}</span>
    </span>
  )
}
