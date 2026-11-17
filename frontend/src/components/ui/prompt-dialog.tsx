import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type PromptField = { name: string; label: string; defaultValue?: string; type?: 'text' | 'datetime-local'; multiline?: boolean; required?: boolean; placeholder?: string; maxLength?: number; hint?: string }
export type PromptConfig = { title: string; description?: ReactNode; fields?: PromptField[]; confirmLabel?: string; destructive?: boolean }
type Values = Record<string, string>

/**
 * Promise-based replacement for window.prompt / window.confirm:
 *   const values = await ask({ title: 'Reject advertisement', fields: [{ name: 'reason', label: 'Reason', required: true }] })
 *   if (!values) return   // cancelled
 * Render {dialog} once in the component tree.
 */
export function usePromptDialog() {
  const [config, setConfig] = useState<PromptConfig | null>(null)
  const resolver = useRef<((values: Values | null) => void) | null>(null)

  const ask = useCallback((next: PromptConfig) => new Promise<Values | null>(resolve => {
    resolver.current?.(null)
    resolver.current = resolve
    setConfig(next)
  }), [])

  function close(values: Values | null) {
    resolver.current?.(values); resolver.current = null; setConfig(null)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    close(Object.fromEntries((config?.fields ?? []).map(field => [field.name, String(data.get(field.name) ?? '').trim()])))
  }

  const dialog = (
    <Dialog open={config !== null} onOpenChange={open => { if (!open) close(null) }}>
      {config && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            {config.description && <DialogDescription>{config.description}</DialogDescription>}
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            {(config.fields ?? []).map((field, index) => (
              <div key={field.name} className="grid gap-2">
                <Label htmlFor={`prompt-${field.name}`}>{field.label}{!field.required && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
                {field.multiline
                  ? <Textarea id={`prompt-${field.name}`} name={field.name} defaultValue={field.defaultValue} required={field.required} placeholder={field.placeholder} maxLength={field.maxLength} rows={3} autoFocus={index === 0} />
                  : <Input id={`prompt-${field.name}`} name={field.name} type={field.type ?? 'text'} defaultValue={field.defaultValue} required={field.required} placeholder={field.placeholder} maxLength={field.maxLength} autoFocus={index === 0} />}
                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(null)}>Cancel</Button>
              <Button type="submit" variant={config.destructive ? 'destructive' : 'default'}>{config.confirmLabel ?? 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
  return { ask, dialog }
}
