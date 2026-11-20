import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, EllipsisVertical, Loader2, Share, Smartphone, SquarePlus, WifiOff, X } from 'lucide-react'
import { isPhoneOrTablet, isStandalone, useInstallApp, useOnline } from '@/lib/pwa'
import { cn } from '@/lib/utils'
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

/** True when the page was opened from the QR code, so the install card shows even if it was dismissed before. */
function cameFromQrCode() {
  try { return new URLSearchParams(window.location.search).has('install') } catch { return false }
}

/** Where the QR code sends a phone: the public site address (VITE_SITE_URL), or this page's own address. */
export function appLink() {
  const base = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')
  return `${base}/?install=1`
}

/** A scannable code for the site with the app icon in the middle. Always dark-on-white so phone cameras can read it in dark mode. */
export function AppQrCode({ size = 176, className }: { size?: number; className?: string }) {
  const icon = Math.round(size * 0.22)
  return (
    <div className={cn('inline-block rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/10', className)}>
      <QRCodeSVG
        value={appLink()}
        size={size}
        level="H"
        bgColor="#ffffff"
        fgColor="#0a3434"
        imageSettings={{ src: '/icons/icon-192.png', width: icon, height: icon, excavate: true }}
        role="img"
        aria-label={`QR code to open ${SITE_NAME} on your phone`}
      />
    </div>
  )
}

/** Computers: show a QR code so people can open the site on their phone and install it there. */
function PhoneQrDialog({ open, onOpenChange, canInstallHere, installHere }: { open: boolean; onOpenChange: (open: boolean) => void; canInstallHere: boolean; installHere: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Get {SITE_NAME} on your phone</DialogTitle>
          <DialogDescription>Point your phone camera at the code, open the link, then tap Install.</DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-2">
          <AppQrCode size={208} />
          <p className="break-all text-center text-xs text-muted-foreground">{appLink().replace(/\?install=1$/, '')}</p>
        </div>
        {canInstallHere && <Button variant="outline" onClick={() => { onOpenChange(false); installHere() }} className="w-full"><Download />Install on this computer instead</Button>}
        <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
      </DialogContent>
    </Dialog>
  )
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
          <li className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary dark:text-brand-primary"><Share className="size-5" aria-hidden="true" /></span><span>Tap the <b>Share</b> button at the bottom of Safari.</span></li>
          <li className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary dark:text-brand-primary"><SquarePlus className="size-5" aria-hidden="true" /></span><span>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</span></li>
        </ol>
        <Button onClick={() => onOpenChange(false)} className="w-full">Got it</Button>
      </DialogContent>
    </Dialog>
  )
}

/** Drop ?install=1 from the address so a reload or a shared link doesn't pop the window up again. */
function forgetQrFlag() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('install')) return
    url.searchParams.delete('install')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch { /* old browser */ }
}

/**
 * Opened from the QR code on a phone: go straight to installing instead of making people find the
 * install card. Browsers always ask the person to confirm, so on Android this is: tap Install, then
 * confirm. iPhones can only add apps from Safari's Share menu, so they see those two steps right away.
 */
function QrInstallWindow() {
  const app = useInstallApp()
  const [open, setOpen] = useState(() => cameFromQrCode() && isPhoneOrTablet() && !isStandalone())
  // Chrome needs a moment after the page loads before it offers installing.
  const [waited, setWaited] = useState(false)
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => setWaited(true), 4000); return () => window.clearTimeout(timer) }, [open])
  function close(next: boolean) { setOpen(next); if (!next) forgetQrFlag() }
  async function install() { if (await app.install()) close(false) }
  if (!open) return null
  const step = (icon: JSX.Element, text: JSX.Element) => <li className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary dark:text-brand-primary">{icon}</span><span>{text}</span></li>
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <img src="/icons/icon-192.png" alt="" className="mb-1 size-16 rounded-2xl" />
          <DialogTitle>Install {SITE_NAME}</DialogTitle>
          <DialogDescription>Free, small and quick on weak data. No Play Store or App Store needed.</DialogDescription>
        </DialogHeader>
        {app.canPrompt
          ? <Button variant="cta" size="lg" className="w-full" onClick={() => void install()}><Download />Install app</Button>
          : app.ios
            ? <ol className="grid gap-3 text-sm">
                {step(<Share className="size-5" aria-hidden="true" />, <>Tap the <b>Share</b> button at the bottom of Safari.</>)}
                {step(<SquarePlus className="size-5" aria-hidden="true" />, <>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</>)}
              </ol>
            : !waited
              ? <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Getting the app ready…</p>
              : <ol className="grid gap-3 text-sm">
                  {step(<EllipsisVertical className="size-5" aria-hidden="true" />, <>Tap the <b>⋮ menu</b> at the top right of your browser.</>)}
                  {step(<SquarePlus className="size-5" aria-hidden="true" />, <>Choose <b>Install app</b> or <b>Add to Home screen</b>.</>)}
                  <li className="text-xs text-muted-foreground">Don't see it? Tap <b>Open in Chrome</b> first. Some camera apps open links in their own small browser.</li>
                </ol>}
        <Button variant={app.canPrompt ? 'ghost' : 'default'} className="w-full" onClick={() => close(false)}>{app.canPrompt ? 'Not now' : 'Done'}</Button>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One-tap install, shared by the home page card and the account menu.
 * On a phone it installs (or shows the iPhone steps); on a computer it shows a QR code for the phone.
 */
export function useInstallAction() {
  const app = useInstallApp()
  const [iosHelpOpen, setIosHelpOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const computer = typeof window !== 'undefined' && !isPhoneOrTablet()
  async function start() {
    if (computer) setQrOpen(true)
    else if (app.canPrompt) await app.install()
    else if (app.ios) setIosHelpOpen(true)
  }
  const dialog = computer
    ? <PhoneQrDialog open={qrOpen} onOpenChange={setQrOpen} canInstallHere={app.canPrompt} installHere={() => void app.install()} />
    : app.ios ? <IosInstallSteps open={iosHelpOpen} onOpenChange={setIosHelpOpen} /> : null
  return {
    canInstall: computer || app.canInstall,
    computer,
    label: computer ? 'Get the app on your phone' : 'Install the app',
    start,
    dialog,
  }
}

/** Home page card inviting people to put the site on their home screen. */
export function InstallAppCard() {
  const { canInstall, computer, start, dialog } = useInstallAction()
  const [hidden, setHidden] = useState(() => !cameFromQrCode() && dismissedRecently())
  if (!canInstall || hidden) return <>{dialog}<QrInstallWindow /></>
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
        {computer && <p className="mt-1 flex items-center gap-1.5 text-sm font-medium"><Smartphone className="size-4 shrink-0 text-primary dark:text-brand-primary" aria-hidden="true" />Scan the code with your phone camera to get it.</p>}
      </div>
      {computer
        ? <button type="button" onClick={() => void start()} aria-label="Show a bigger QR code" title="Show a bigger QR code" className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><AppQrCode size={88} className="p-1.5" /></button>
        : <Button variant="cta" onClick={() => void start()} className="w-full shrink-0 sm:w-auto"><Download />Install</Button>}
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2 top-2 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></button>
      {dialog}
      <QrInstallWindow />
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
