import { cn } from '@/lib/utils'
import { BRAND_WORD, COUNTRY_CODE, COUNTRY_NAME } from '@/config/site'

const LOGO_FONT = 'Poppins, sans-serif'

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
