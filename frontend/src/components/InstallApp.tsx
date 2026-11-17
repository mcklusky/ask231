import { useState } from 'react'
import { Download, Share, SquarePlus, WifiOff, X } from 'lucide-react'
import { useInstallApp, useOnline } from '@/lib/pwa'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SITE_NAME } from '@/config/site'

const DISMISS_KEY = 'marketday.install-dismissed'
const DISMISS_DAYS = 14

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

/** Shows iPhone users how to add the app, since Safari has no install button. */
function IosInstallSteps({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add {SITE_NAME} to your home screen</DialogTitle>
          <DialogDescription>It takes two taps. No App Store needed.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3 text-sm">
          <li className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary dark:text-brand-blue"><Share className="size-5" aria-hidden="true" /></span><span>Tap the <b>Share</b> button at the bottom of Safari.</span></li>
          <li className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary dark:text-brand-blue"><SquarePlus className="size-5" aria-hidden="true" /></span><span>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</span></li>
        </ol>
        <Button onClick={() => onOpenChange(false)} className="w-full">Got it</Button>
      </DialogContent>
    </Dialog>
  )
}

/** One-tap install, shared by the home page card and the account menu. */
export function useInstallAction() {
  const app = useInstallApp()
  const [iosHelpOpen, setIosHelpOpen] = useState(false)
  async function start() {
    if (app.canPrompt) await app.install()
    else if (app.ios) setIosHelpOpen(true)
  }
  const dialog = app.ios ? <IosInstallSteps open={iosHelpOpen} onOpenChange={setIosHelpOpen} /> : null
  return { canInstall: app.canInstall, start, dialog }
}

/** Home page card inviting people to put the site on their home screen. */
export function InstallAppCard() {
  const { canInstall, start, dialog } = useInstallAction()
  const [hidden, setHidden] = useState(dismissedRecently)
  if (!canInstall || hidden) return dialog
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* private mode */ }
    setHidden(true)
  }
  return (
    <section aria-label={`Get the ${SITE_NAME} app`} className="relative my-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 pr-12 shadow-sm">
      <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-[180px] flex-1">
        <p className="font-display font-bold">Get the {SITE_NAME} app</p>
        <p className="text-sm text-muted-foreground">Free, small and quick on weak data. No Play Store or App Store needed.</p>
      </div>
      <Button variant="cta" onClick={() => void start()} className="w-full shrink-0 sm:w-auto"><Download />Install</Button>
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2 top-2 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></button>
      {dialog}
    </section>
  )
}

/** A slim bar while the phone has no connection, so people know why things look old or fail. */
export function OfflineBar() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background shadow-lg" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      You're offline. Showing ads saved on this phone.
    </div>
  )
}
