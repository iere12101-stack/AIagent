'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface GapRow {
  area: string
  bedrooms: string
  type: string
  count: number
  avgBudget: number
}

export function InventoryGapsPanel() {
  const { data } = useQuery({
    queryKey: ['inventory-gaps'],
    queryFn: () => fetch('/api/properties/inventory-gaps').then(r => r.json()),
    refetchInterval: 60_000,
  })

  const topGaps: GapRow[] = data?.topGaps ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Inventory Gaps
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            Properties clients asked for but we did not have
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topGaps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No gaps logged yet - AI is finding matches for all client requests
          </p>
        ) : (
          <div className="space-y-2">
            {topGaps.map((gap, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      gap.type === 'SALE'
                        ? 'text-emerald-600 border-emerald-200 text-[11px]'
                        : 'text-blue-600 border-blue-200 text-[11px]'
                    }
                  >
                    {gap.type}
                  </Badge>
                  <span className="font-medium">{gap.area}</span>
                  {gap.bedrooms && (
                    <span className="text-muted-foreground">
                      . {gap.bedrooms === 'Studio' ? 'Studio' : `${gap.bedrooms}BR`}
                    </span>
                  )}
                  {gap.avgBudget > 0 && (
                    <span className="text-muted-foreground text-xs">
                      . AED {(gap.avgBudget / 1_000_000).toFixed(1)}M avg
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-amber-500" />
                  <span className="font-medium text-amber-600">{gap.count}x missed</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
          Add these as Direct Properties to reduce lead loss to partner listings.
        </p>
      </CardContent>
    </Card>
  )
}
