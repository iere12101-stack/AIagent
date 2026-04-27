'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MapPin,
  Layers,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ── Types ────────────────────────────────────────────────────────────────────

interface PropertyStats {
  totalListings: number
  availablePercent: number
  avgPrice: number
  topDistrict: string
  topDistrictCount: number
  salePercent: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAed(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

// ── Donut Indicator (CSS-only) ───────────────────────────────────────────────

function DonutIndicator({
  percentage,
  size = 80,
  strokeWidth = 8,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Unavailable portion */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="stroke-red-300 dark:stroke-red-700"
          strokeLinecap="round"
        />
        {/* Available portion */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-emerald-500"
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold data-value-emphasis text-emerald-600 dark:text-emerald-400">
          {percentage}%
        </span>
        <span className="text-[9px] text-muted-foreground -mt-0.5">Available</span>
      </div>
    </div>
  )
}

// ── Main Widget ──────────────────────────────────────────────────────────────

export function PropertyStatsWidget() {
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/properties/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="card-hover hover-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-1.5 animate-pulse">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const totalListings = stats?.totalListings ?? 0
  const availablePercent = stats?.availablePercent ?? 0
  const avgPrice = stats?.avgPrice ?? 0
  const topDistrict = stats?.topDistrict ?? '—'
  const topDistrictCount = stats?.topDistrictCount ?? 0
  const salePercent = stats?.salePercent ?? 0
  const rentPercent = 100 - salePercent

  return (
    <Card className="card-hover hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-1.5">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Property Statistics
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Layers className="h-3 w-3" />
            {totalListings > 0 ? `${totalListings} listings` : 'No data'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Market Overview ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Overview</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Avg. Price</p>
              <p className="text-sm font-bold data-value-emphasis mt-0.5">
                {avgPrice > 0 ? formatAed(avgPrice) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Top District</p>
              <p className="text-sm font-bold data-value-emphasis mt-0.5">
                {topDistrict}{topDistrictCount > 0 ? ` (${topDistrictCount})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── Sale/Rent Split ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Type</h4>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 transition-all duration-500 flex items-center justify-center"
              style={{ width: `${salePercent}%` }}
              title={`Sale: ${salePercent}%`}
            >
              {salePercent >= 15 && (
                <span className="text-[8px] font-bold text-white">{salePercent}%</span>
              )}
            </div>
            <div
              className="bg-blue-500 transition-all duration-500 flex items-center justify-center"
              style={{ width: `${rentPercent}%` }}
              title={`Rent: ${rentPercent}%`}
            >
              {rentPercent >= 15 && (
                <span className="text-[8px] font-bold text-white">{rentPercent}%</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Sale ({salePercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Rent ({rentPercent}%)</span>
            </div>
          </div>
        </div>

        {/* ── Availability ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Availability</h4>
          <div className="flex items-center gap-5">
            <DonutIndicator percentage={availablePercent} />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <span className="text-sm font-bold data-value-emphasis">{availablePercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-300 dark:bg-red-700" />
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                </div>
                <span className="text-sm font-bold text-muted-foreground">{100 - availablePercent}%</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Listings</span>
                  <span className="text-sm font-bold">{totalListings || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
