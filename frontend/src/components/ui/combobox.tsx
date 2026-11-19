import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

export type ComboboxOption = { value: string; label: string; hint?: string; keywords?: string[] }

type ComboboxProps = {
  id?: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  /** Accessible name when there is no visible <label htmlFor={id}>. */
  'aria-label'?: string
}

/** Searchable dropdown (shadcn Popover + Command): type "Mon" to jump to Montserrado. */
export function Combobox({ id, options, value, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyText = 'No matches found.', disabled, invalid, className, ...rest }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find(option => option.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-label={rest['aria-label']}
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base shadow-sm transition-colors md:text-sm',
            'hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            invalid && 'border-destructive',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px]">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.hint ?? ''} ${(option.keywords ?? []).join(' ')}`}
                  onSelect={() => { onChange(option.value); setOpen(false) }}
                >
                  <Check className={cn('text-primary', option.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
