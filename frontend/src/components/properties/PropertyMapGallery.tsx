'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Building2,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { type Property } from '@/components/properties/PropertyDetailSheet'

// ── Types ────────────────────────────────────────────────────────────────────

interface PropertyMapGalleryProps {
  filters: {
    search?: string
    type?: string
    category?: string
    bedrooms?: string
    status?: string
    area?: string
    minPrice?: string
    maxPrice?: string
    available?: boolean
  }
  onOpenDetail: (property: Property) => void
}

interface AreaStat {
  name: string
  count: number
  avgPrice: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAed(value: number): string {
  return `AED ${value.toLocaleString()}`
}

function formatCompactAed(value: number): string {
  if (value >= 1_000_000) {
    return `AED ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `AED ${(value / 1_000).toFixed(0)}K`
  }
  return `AED ${value.toLocaleString()}`
}

function formatPricePerSqft(price: number, size: number | null): string {
  if (!size || size <= 0) return ''
  const pps = Math.round(price / size)
  return `${pps.toLocaleString()} AED/sqft`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ── Area Stats Bar ───────────────────────────────────────────────────────────

function AreaStatsBar({ areas }: { areas: AreaStat[] }) {
  const maxCount = Math.max(...areas.map((a) => a.count), 1)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {areas.map((area) => {
        const heatPercent = Math.round((area.count / maxCount) * 100)
        const opacity = 0.25 + (heatPercent / 100) * 0.75
        return (
          <Card key={area.name} className="card-hover overflow-hidden p-0">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-[90px]">
                  {area.name}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 h-5 font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {area.count}
                </Badge>
              </div>
              <p className="text-xs font-bold text-foreground">
                {formatCompactAed(area.avgPrice)}
              </p>
              {/* Heat bar */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${heatPercent}%`, opacity }}
                />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Compact Property Card ────────────────────────────────────────────────────

function GalleryPropertyCard({
  property,
  onClick,
}: {
  property: Property
  onClick: () => void
}) {
  const isSale = property.transactionType === 'SALE'
  const headerBg = isSale
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
    : 'bg-gradient-to-r from-blue-500 to-blue-600'
  const bedsLabel = property.bedrooms
    ? property.bedrooms === 'Studio'
      ? 'Studio'
      : `${property.bedrooms}BR`
    : ''
  const categoryBeds = bedsLabel
    ? `${bedsLabel} ${property.category}`
    : property.category

  const pps = formatPricePerSqft(property.priceAed, property.sizeSqft)
  const agentName = property.agentName || 'Unassigned'
  const agentInitials = getInitials(agentName)
  const agentColor = getAvatarColor(agentName)

  return (
    <Card
      className="card-hover cursor-pointer overflow-hidden group"
      onClick={onClick}
    >
      {/* Colored header strip */}
      <div className={`h-1.5 w-full ${headerBg}`} />

      <div className="p-3.5 space-y-2.5">
        {/* Row 1: Ref + Type badge + Available dot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {property.refNumber}
            </span>
            <Badge
              className={
                isSale
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1.5 py-0 h-4 font-semibold'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-[9px] px-1.5 py-0 h-4 font-semibold'
              }
            >
              {property.transactionType}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                property.available ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
            <span className="text-[9px] text-muted-foreground">
              {property.available ? 'Avail' : 'Sold'}
            </span>
          </div>
        </div>

        {/* Row 2: Category + Bedrooms */}
        <div>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 font-medium border-muted-foreground/30"
          >
            {categoryBeds}
          </Badge>
        </div>

        {/* Row 3: District + Building */}
        <div className="min-h-[36px]">
          <p className="text-xs font-medium truncate leading-tight">
            {property.district || '—'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
            {property.building || '—'}
          </p>
        </div>

        {/* Row 4: Price */}
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-foreground">
            {formatAed(property.priceAed)}
          </p>
          {pps && (
            <p className="text-[10px] text-muted-foreground">{pps}</p>
          )}
        </div>

        {/* Row 5: Agent */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Avatar className="h-5 w-5">
            <AvatarFallback
              className={`${agentColor} text-[8px] text-white font-semibold`}
            >
              {agentInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground truncate">
            {agentName}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ── Gallery Skeleton ─────────────────────────────────────────────────────────

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      {/* Area stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-0">
            <Skeleton className="h-1.5 w-full" />
            <div className="p-3.5 space-y-2.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-28" />
              <div className="pt-2 border-t">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PropertyMapGallery({
  filters,
  onOpenDetail,
}: PropertyMapGalleryProps) {
  const [cursor, setCursor] = useState<string | null>(null)

  // ── Build Query URL ─────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.category) params.set('category', filters.category)
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
    if (filters.status) params.set('status', filters.status)
    if (filters.area) params.set('area', filters.area)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.available !== undefined)
      params.set('available', String(filters.available))
    if (cursor) params.set('cursor', cursor)
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [filters, cursor])

  // ── Fetch Properties ───────────────────────────────────────────────────
  const propertiesQuery = useQuery<{
    data: Property[]
    nextCursor: string | null
    total: number
  }>({
    queryKey: ['properties-gallery', queryParams],
    queryFn: () => fetch(`/api/properties?${queryParams}`).then((r) => r.json()),
  })

  const properties = propertiesQuery.data?.data ?? []
  const nextCursor = propertiesQuery.data?.nextCursor ?? null
  const totalCount = propertiesQuery.data?.total ?? 0
  const displayedCount = properties.length
  const currentPageStart = cursor ? displayedCount - PAGE_SIZE + 1 : 1
  const currentPageEnd = currentPageStart + displayedCount - 1

  // ── Compute Area Stats from loaded properties ───────────────────────────
  const areaStats = useMemo(() => {
    const areaMap = new Map<
      string,
      { count: number; totalPrice: number }
    >()

    for (const p of properties) {
      const area = p.district || 'Unknown'
      const existing = areaMap.get(area)
      if (existing) {
        existing.count++
        existing.totalPrice += p.priceAed
      } else {
        areaMap.set(area, { count: 1, totalPrice: p.priceAed })
      }
    }

    const stats: AreaStat[] = Array.from(areaMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgPrice: Math.round(data.totalPrice / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return stats
  }, [properties])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }

  const handleResetCursor = () => {
    setCursor(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (propertiesQuery.isLoading) {
    return <GallerySkeleton />
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No properties found
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your filters or search terms
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* ── Area Statistics Bar ─────────────────────────────────────────── */}
      {areaStats.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Top Areas</h3>
            <span className="text-[10px] text-muted-foreground">
              by property count
            </span>
          </div>
          <AreaStatsBar areas={areaStats} />
        </div>
      )}

      {/* ── Property Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 stagger-children">
        {properties.map((property) => (
          <GalleryPropertyCard
            key={property.id}
            property={property}
            onClick={() => onOpenDetail(property)}
          />
        ))}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {currentPageStart}&ndash;{currentPageEnd} of {totalCount}{' '}
          properties
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!cursor}
            onClick={handleResetCursor}
            className="gap-1"
          >
            <MapPin className="h-4 w-4" />
            Start
          </Button>
          {nextCursor && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={propertiesQuery.isFetching}
              className="gap-1"
            >
              <ChevronRight className="h-4 w-4" />
              Load More
            </Button>
          )}
          {!nextCursor && properties.length > 0 && (
            <span className="text-xs text-muted-foreground px-3 py-1.5">
              End of results
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
