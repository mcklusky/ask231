import { useState } from 'react'
import { Check, Plus, Undo2, WandSparkles } from 'lucide-react'
import { addDetail, fillDescription, hasDetail, quickDetails, type DescribeInput } from '@/lib/describe'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Less typing for sellers: one-tap details for the chosen category, and "Fill in for me", which turns
 * a few words into a tidy description. No AI: everything happens on the phone, free and instant.
 */
export default function DescriptionHelper({ input, onChange }: { input: DescribeInput; onChange: (description: string) => void }) {
  const [previous, setPrevious] = useState<string | null>(null)
  const details = input.category ? quickDetails(input.category, input.subcategory) : []
  const canFill = Boolean(input.title.trim() || input.notes.trim())

  function fill() {
    const next = fillDescription(input)
    if (next === input.notes) return
    setPrevious(input.notes); onChange(next)
  }

  return (
    <div className="grid gap-2.5">
      {details.length > 0 && <div className="grid gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Tap to add details</span>
        <div className="flex flex-wrap gap-1.5">
          {details.map(detail => {
            const added = hasDetail(input.notes, detail)
            return <button key={detail} type="button" disabled={added} onClick={() => { setPrevious(null); onChange(addDetail(input.notes, detail)) }} aria-pressed={added}
              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', added ? 'border-primary/30 bg-secondary text-primary dark:text-brand-primary' : 'hover:border-primary hover:text-primary dark:hover:text-brand-primary')}>
              {added ? <Check className="size-3" aria-hidden="true" /> : <Plus className="size-3" aria-hidden="true" />}{detail}
            </button>
          })}
        </div>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={fill} disabled={!canFill} className="border-primary/40 text-primary hover:bg-secondary dark:text-brand-primary"><WandSparkles />Fill in for me</Button>
        {previous !== null && <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(previous); setPrevious(null) }}><Undo2 />Undo</Button>}
        <span className="text-xs text-muted-foreground">{previous !== null ? 'Check it and edit anything before you post.' : canFill ? 'Turns your title and notes into a tidy description.' : 'Add a title first.'}</span>
      </div>
    </div>
  )
}
