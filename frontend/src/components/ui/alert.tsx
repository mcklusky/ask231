import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      error: 'border-destructive/30 bg-destructive/10 text-destructive',
      success: 'border-emerald-600/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
      info: 'border-primary/25 bg-secondary text-secondary-foreground',
    },
  },
  defaultVariants: { variant: 'info' },
})

function Alert({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
