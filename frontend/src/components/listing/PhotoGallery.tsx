import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, Expand, Store, X } from 'lucide-react'
import type { AdImage } from '@/lib/marketplace'
import { cn } from '@/lib/utils'

/** Swipeable strip of photos; reports which one is in view. Used on the ad page and in the full-screen viewer. */
function useStrip(count: number, onIndex: (index: number) => void) {
  const strip = useRef<HTMLDivElement>(null)
  const goTo = useCallback((index: number, smooth = true) => {
    const el = strip.current
    if (!el) return
    const next = (index + count) % count
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }, [count])
  const onScroll = useCallback(() => {
    const el = strip.current
    if (el && el.clientWidth) onIndex(Math.round(el.scrollLeft / el.clientWidth))
  }, [onIndex])
  return { strip, goTo, onScroll }
}

const stripClass = 'flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/**
 * Ad page photos, shop style: every photo in the same square white box (shown whole, never cropped), edge to
 * edge on phones. Swipe (or arrows on computers) to move between them; tap to open full screen and pinch to zoom.
 */
export default function PhotoGallery({ images, title }: { images: AdImage[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const { strip, goTo, onScroll } = useStrip(images.length, setIndex)
  const many = images.length > 1

  if (!images.length) return <div className="detail-gallery"><div className="detail-main-image"><div className="listing-placeholder large"><Store size={58} /></div></div></div>

  function closeViewer(open: boolean, at: number) {
    setViewerOpen(open)
    if (!open) { setIndex(at); goTo(at, false) }
  }

  return (
    <div className="detail-gallery photo-gallery">
      <div className="detail-main-image photo-square" aria-roledescription="carousel" aria-label={`Photos of ${title}`}>
        <div ref={strip} onScroll={onScroll} className={stripClass}>
          {images.map((image, i) => (
            <button key={image.id} type="button" onClick={() => { setIndex(i); setViewerOpen(true) }} className="relative h-full w-full shrink-0 snap-center cursor-zoom-in" aria-label={`Open photo ${i + 1} of ${images.length} full screen`}>
              <img
                src={image.image_url}
                alt={image.alt_text || `${title} ${i + 1}`}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
        {many && <>
          <button type="button" aria-label="Previous photo" onClick={() => goTo(index - 1)}><ChevronLeft size={20} /></button>
          <button type="button" aria-label="Next photo" onClick={() => goTo(index + 1)}><ChevronRight size={20} /></button>
          <span className="photo-count" aria-live="polite">{index + 1}/{images.length}</span>
        </>}
        <span className="photo-expand" aria-hidden="true"><Expand size={15} /></span>
      </div>
      {many && (
        <div className="detail-thumbnails photo-thumbs">
          {images.map((image, i) => (
            <button key={image.id} type="button" className={i === index ? 'selected' : ''} aria-label={`Show photo ${i + 1}`} aria-current={i === index ? 'true' : undefined} onClick={() => goTo(i)}>
              <img src={image.thumbnail_url || image.image_url} loading="lazy" decoding="async" alt="" />
            </button>
          ))}
        </div>
      )}
      <PhotoViewer images={images} title={title} open={viewerOpen} start={index} onClose={closeViewer} />
    </div>
  )
}

/** Full screen, dark background, photo as large as the screen allows; swipe, arrow keys or buttons to move, pinch to zoom. */
function PhotoViewer({ images, title, open, start, onClose }: { images: AdImage[]; title: string; open: boolean; start: number; onClose: (open: boolean, at: number) => void }) {
  const [index, setIndex] = useState(start)
  const { strip, goTo, onScroll } = useStrip(images.length, setIndex)
  const many = images.length > 1

  // Open on the photo that was tapped, without an animated scroll from the first one.
  useLayoutEffect(() => { if (open) setIndex(start) }, [open, start])
  useEffect(() => {
    if (!open || !many) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') goTo(index + 1); if (event.key === 'ArrowLeft') goTo(index - 1) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, many, index, goTo])

  const control = 'grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
  return (
    <DialogPrimitive.Root open={open} onOpenChange={next => onClose(next, index)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col text-white focus:outline-none" aria-describedby={undefined} onOpenAutoFocus={() => goTo(start, false)}>
          <DialogPrimitive.Title className="sr-only">Photos of {title}</DialogPrimitive.Title>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur" aria-live="polite">{many ? `${index + 1} / ${images.length}` : title}</span>
            <DialogPrimitive.Close className={control} aria-label="Close photos"><X className="size-6" /></DialogPrimitive.Close>
          </div>
          <div ref={strip} onScroll={onScroll} className={cn(stripClass, 'flex-1 touch-pan-x touch-pinch-zoom')}>
            {images.map((image, i) => (
              <div key={image.id} className="grid h-full w-full shrink-0 snap-center place-items-center">
                <img src={image.image_url} alt={image.alt_text || `${title} ${i + 1}`} loading={Math.abs(i - start) <= 1 ? 'eager' : 'lazy'} decoding="async" className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
          {many && <>
            <button type="button" onClick={() => goTo(index - 1)} className={cn(control, 'absolute left-3 top-1/2 hidden -translate-y-1/2 md:grid')} aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
            <button type="button" onClick={() => goTo(index + 1)} className={cn(control, 'absolute right-3 top-1/2 hidden -translate-y-1/2 md:grid')} aria-label="Next photo"><ChevronRight className="size-6" /></button>
          </>}
          <p className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center text-xs text-white/70" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{many ? 'Swipe to see more · ' : ''}Pinch to zoom</p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
