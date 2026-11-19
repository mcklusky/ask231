import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { SITE_NAME } from '@/config/site'

/**
 * Installable app ("Add to home screen") support: service worker registration,
 * the "new version" prompt, the install prompt and online/offline status.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

if (typeof window !== 'undefined') {
  // Chrome on Android fires this early; keep it so our own "Install app" button can use it later.
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event as InstallPromptEvent; notify() })
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); toast.success(`${SITE_NAME} is on your home screen`) })
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone/iPad Safari: no install prompt, people add the app from the Share menu. */
export function isIosSafari() {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
}

/** Phones and tablets install the app directly; computers get a QR code to open the site on a phone instead. */
export function isPhoneOrTablet() {
  const ua = navigator.userAgent
  return /android|iphone|ipad|ipod|mobile|silk|kaios/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useInstallApp() {
  const canPrompt = useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener) },
    () => deferredPrompt !== null,
    () => false,
  )
  const installed = typeof window !== 'undefined' && isStandalone()
  const ios = typeof window !== 'undefined' && isIosSafari()
  async function install() {
    if (!deferredPrompt) return false
    const event = deferredPrompt
    deferredPrompt = null; notify()
    await event.prompt()
    return (await event.userChoice).outcome === 'accepted'
  }
  return { canInstall: !installed && (canPrompt || ios), canPrompt, ios, installed, install }
}

export function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])
  return online
}

/** Forget saved listing data on this phone (on sign-out, so a shared phone keeps nothing private). */
export async function clearSavedData() {
  try { if ('caches' in window) await caches.delete('md-api') } catch { /* storage unavailable */ }
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      let updateRequested = false
      let reloading = false
      // Reload only when the person tapped "Update" (not when the very first version installs).
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateRequested && !reloading) { reloading = true; window.location.reload() } })
      const offerUpdate = (worker: ServiceWorker) => {
        toast(`A new version of ${SITE_NAME} is ready`, {
          duration: Infinity,
          action: { label: 'Update', onClick: () => { updateRequested = true; worker.postMessage('SKIP_WAITING') } },
        })
      }
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker)
        })
      })
      // An installed app can stay open for days; look for a new version whenever it comes back to the front.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void registration.update().catch(() => undefined) })
    } catch { /* the site still works without offline support */ }
  })
}
