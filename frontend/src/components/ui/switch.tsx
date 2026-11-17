import { cn } from '@/lib/utils'

/** An on/off toggle (shadcn-style switch, accessible as role="switch"). */
export function Switch({ checked, onCheckedChange, disabled, id, className, ...aria }: { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; id?: string; className?: string; 'aria-label'?: string; 'aria-describedby'?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary dark:bg-brand-blue' : 'bg-input',
        className,
      )}
      {...aria}
    >
      <span className={cn('pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}
