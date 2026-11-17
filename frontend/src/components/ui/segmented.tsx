import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

/** A row of one-tap choices (radio group styled as a segmented control). */
export function Segmented({ label, value, onChange, options, className }: { label: string; value: string; onChange: (value: string) => void; options: Option[]; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-1 rounded-lg bg-muted p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(option => (
        <button
          key={option.value || 'any'}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option.value ? 'bg-card text-primary shadow-sm dark:text-brand-blue' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
