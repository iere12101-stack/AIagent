'use client'

import { TrendingUp, TrendingDown, Building2, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'

// ── Simulated 6-month price data ──────────────────────────────────────────────

const apartmentData = [
  { month: 'Jul', price: 1100 },
  { month: 'Aug', price: 1120 },
  { month: 'Sep', price: 1095 },
  { month: 'Oct', price: 1140 },
  { month: 'Nov', price: 1160 },
  { month: 'Dec', price: 1180 },
]

const villaData = [
  { month: 'Jul', price: 4200 },
  { month: 'Aug', price: 4280 },
  { month: 'Sep', price: 4150 },
  { month: 'Oct', price: 4320 },
  { month: 'Nov', price: 4410 },
  { month: 'Dec', price: 4500 },
]

// ── Sparkline Row ──────────────────────────────────────────────────────────────

function SparklineRow({
  label,
  icon,
  data,
  currentPrice,
  startPrice,
  formatPrice,
}: {
  label: string
  icon: React.ReactNode
  data: { month: string; price: number }[]
  currentPrice: number
  startPrice: number
  formatPrice: (price: number) => string
}) {
  const trend = ((currentPrice - startPrice) / startPrice) * 100
  const isPositive = trend >= 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 w-24 shrink-0">
        <div className={`rounded-lg p-1.5 ${isPositive ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sparkGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fill={`url(#sparkGrad-${label})`}
              isAnimationActive
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-right shrink-0 w-28">
        <div className="text-sm font-bold">{formatPrice(currentPrice)}</div>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 font-semibold ${
            isPositive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
          {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </Badge>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function PropertyPriceTrends() {
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `AED ${(price / 1000).toFixed(1)}M`
    }
    return `AED ${price}K`
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          Price Trends
          <Badge variant="outline" className="text-[10px] ml-auto text-muted-foreground">
            6 months
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SparklineRow
          label="Apartments"
          icon={<Building2 className="h-3.5 w-3.5 text-emerald-600" />}
          data={apartmentData}
          currentPrice={apartmentData[apartmentData.length - 1].price}
          startPrice={apartmentData[0].price}
          formatPrice={formatPrice}
        />
        <div className="border-t border-border/50" />
        <SparklineRow
          label="Villas"
          icon={<Home className="h-3.5 w-3.5 text-emerald-600" />}
          data={villaData}
          currentPrice={villaData[villaData.length - 1].price}
          startPrice={villaData[0].price}
          formatPrice={formatPrice}
        />
      </CardContent>
    </Card>
  )
}
