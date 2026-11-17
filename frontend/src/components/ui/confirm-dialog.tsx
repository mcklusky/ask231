import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type ConfirmDialogProps = {
  /** The element that opens the dialog (rendered asChild). */
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel?: string
  /** Red confirm button for destructive actions such as deleting. */
  destructive?: boolean
  onConfirm: () => Promise<unknown> | unknown
}

/** "Are you sure?" dialog that replaces window.confirm, with a busy state while the action runs. */
export function ConfirmDialog({ trigger, title, description, confirmLabel = 'Confirm', destructive = false, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  async function confirm() {
    setBusy(true)
    try { await onConfirm(); setOpen(false) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next) }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => void confirm()} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
