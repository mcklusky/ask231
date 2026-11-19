import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  icon?: ReactNode
  /** Shown at the right of the label row (e.g. "Forgot password?"). */
  labelAside?: ReactNode
  /** Fixed text inside the field on the left, e.g. a currency. */
  prefix?: string
}

/** Labelled text input with optional icon, prefix, password reveal, hint and error (shadcn Input). */
export default function FormField({ label, hint, error, icon, labelAside, prefix, type = 'text', id, className, ...props }: Props) {
  const [shown, setShown] = useState(false)
  const inputId = id || props.name || label.toLowerCase().replace(/ /g, '-')
  const password = type === 'password'
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        {labelAside}
      </div>
      <div className="relative flex">
        {prefix && <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-bold text-muted-foreground">{prefix}</span>}
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4" aria-hidden="true">{icon}</span>}
        <Input
          id={inputId}
          type={password && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(icon && 'pl-10', password && 'pr-11', prefix && 'rounded-l-none', error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25', props.readOnly && 'bg-muted text-muted-foreground', className)}
          {...props}
        />
        {password && (
          <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? <p id={`${inputId}-error`} className="text-xs font-medium text-destructive">{error}</p>
        : hint && <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
