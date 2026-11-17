import { BadgeCheck, ShieldCheck, Store } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** "Listed by" card plus buyer safety tips, shown under the contact panel. */
export default function SellerCard({ name, verified, note }: { name: string; verified: boolean; note?: string }) {
  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Store className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Listed by</p>
          <p className="truncate font-semibold text-foreground">{name}</p>
          {verified
            ? <Badge variant="default" className="mt-1"><BadgeCheck aria-hidden="true" />Verified seller</Badge>
            : <span className="text-xs text-muted-foreground">{note || 'Community seller'}</span>}
        </div>
      </Card>
      <Card className="border-primary/20 bg-secondary/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />Stay safe when buying</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-xs leading-relaxed text-muted-foreground">
          <li>Meet in a busy public place, in daylight.</li>
          <li>Check the item works before you pay.</li>
          <li>Never send money or mobile money in advance.</li>
        </ul>
      </Card>
    </div>
  )
}
