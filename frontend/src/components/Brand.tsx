import { cn } from '@/lib/utils'
import { BRAND_WORD, COUNTRY_CODE, COUNTRY_NAME } from '@/config/site'

/**
 * The wordmark: brand word plus the country code in a small badge ("Ask" + "231").
 * `onBlue` is for the blue header and dark sidebars; otherwise it sits on white or card backgrounds.
 */
export function BrandName({ onBlue = false, className }: { onBlue?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-display font-extrabold tracking-tight', className)}>
      {BRAND_WORD}
      <span className={cn('rounded-md px-1.5 py-px text-[0.85em] leading-tight', onBlue ? 'bg-white text-brand-red' : 'bg-brand-red text-white')}>{COUNTRY_CODE}</span>
    </span>
  )
}

/** Wordmark with the country name underneath, used next to the logo icon. */
export function BrandLockup({ onBlue = false, hideCountryOnTiny = false }: { onBlue?: boolean; hideCountryOnTiny?: boolean }) {
  return (
    <span className="leading-none">
      <BrandName onBlue={onBlue} className={cn('text-[19px]', onBlue ? 'text-white' : 'text-foreground')} />
      <span className={cn('mt-1 block font-display text-[10px] font-bold uppercase tracking-[0.2em]', onBlue ? 'text-white/75' : 'text-muted-foreground', hideCountryOnTiny && 'max-[359px]:hidden')}>{COUNTRY_NAME}</span>
    </span>
  )
}
