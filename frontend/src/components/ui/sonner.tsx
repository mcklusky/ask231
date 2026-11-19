import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/lib/theme'

type ToasterProps = React.ComponentProps<typeof Sonner>

/** Small confirmation messages ("Saved to your listings"), themed to match the site. */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-center"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast font-sans group-[.toaster]:rounded-lg group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-sm group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:[&_[data-icon]]:text-emerald-600',
          error: 'group-[.toaster]:[&_[data-icon]]:text-destructive',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
