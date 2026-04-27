'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, Building2, CircleDollarSign, MapPin, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchJson } from '@/lib/api'
import type { CursorPage, PropertyRecord } from '@/types'
import { PropertyCarousel } from './PropertyCarousel'

function normalizeBudgetValue(value: number, unit?: string): number {
  if (!unit) {
    return value
  }

  if (unit === 'm' || unit === 'million') {
    return value * 1_000_000
  }

  if (unit === 'k' || unit === 'thousand') {
    return value * 1_000
  }

  return value
}

function parseBudgetRange(rawBudget: string | null | undefined): {
  minPrice?: number
  maxPrice?: number
} {
  if (!rawBudget) {
    return {}
  }

  const normalized = rawBudget
    .toLowerCase()
    .replace(/aed|dirhams?|dhs?/g, ' ')
    .replace(/to/gi, '-')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const matches = Array.from(
    normalized.matchAll(/(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/g),
  )

  const values = matches
    .map((match) => normalizeBudgetValue(Number(match[1]), match[2]))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length === 0) {
    return {}
  }

  if (values.length > 1 && normalized.includes('-')) {
    return {
      minPrice: Math.min(...values),
      maxPrice: Math.max(...values),
    }
  }

  return { maxPrice: Math.max(...values) }
}

interface PropertyMatchPanelProps {
  area?: string | null
  budget?: string | null
  bedrooms?: string | null
  className?: string
}

export function PropertyMatchPanel({
  area,
  budget,
  bedrooms,
  className,
}: PropertyMatchPanelProps) {
  const budgetRange = useMemo(() => parseBudgetRange(budget), [budget])
  const hasCriteria = Boolean(area || budget || bedrooms)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      limit: '3',
      available: 'true',
    })

    if (area) {
      params.set('area', area)
    }

    if (bedrooms) {
      params.set('bedrooms', bedrooms)
    }

    if (budgetRange.minPrice) {
      params.set('minPrice', String(Math.round(budgetRange.minPrice)))
    }

    if (budgetRange.maxPrice) {
      params.set('maxPrice', String(Math.round(budgetRange.maxPrice)))
    }

    return params.toString()
  }, [area, bedrooms, budgetRange.maxPrice, budgetRange.minPrice])

  const propertiesQuery = useQuery<CursorPage<PropertyRecord>>({
    queryKey: ['property-match-panel', area, budget, bedrooms],
    enabled: hasCriteria,
    queryFn: () => fetchJson<CursorPage<PropertyRecord>>(`/api/properties?${queryString}`),
  })

  const criteriaBadges = [
    area ? { label: area, icon: <MapPin className="h-3 w-3" /> } : null,
    budget ? { label: budget, icon: <CircleDollarSign className="h-3 w-3" /> } : null,
    bedrooms ? { label: `${bedrooms} BR`, icon: <BedDouble className="h-3 w-3" /> } : null,
  ].filter(
    (entry): entry is { label: string; icon: ReactElement } => Boolean(entry),
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Property Match Panel
        </CardTitle>
        <CardDescription>
          Live property suggestions built from the current contact memory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {criteriaBadges.length > 0 ? (
            criteriaBadges.map((badge) => (
              <Badge key={badge.label} variant="outline" className="gap-1">
                {badge.icon}
                {badge.label}
              </Badge>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Capture area, budget, or bedroom preferences to unlock automatic property suggestions.
            </div>
          )}
        </div>

        {propertiesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : hasCriteria ? (
          <PropertyCarousel
            properties={propertiesQuery.data?.data ?? []}
            emptyMessage="No live matches fit the captured criteria yet."
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            {propertiesQuery.data?.data.length ?? 0} live matches loaded
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Link href="/properties">
              Browse all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PropertyMatchPanel
