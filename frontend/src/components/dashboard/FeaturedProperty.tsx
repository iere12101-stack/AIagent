'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Star, MapPin, Bed, Ruler, ArrowRight, User } from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface Property {
  id: string
  refNumber: string
  transactionType: string
  category: string
  bedrooms: string | null
  bathrooms: number | null
  sizeSqft: number | null
  priceAed: number
  district: string | null
  building: string | null
  agentName: string | null
  status: string | null
}

export function FeaturedProperty() {
  const { setCurrentPage } = useAppStore()

  const { data, isLoading } = useQuery<{ data: Property[] }>({
    queryKey: ['featured-property'],
    queryFn: () => fetch('/api/properties?limit=1&available=true').then((r) => r.json()),
    staleTime: 300000, // 5 min
  })

  const property = data?.data?.[0]

  if (isLoading) {
    return (
      <Card className="overflow-hidden card-hover">
        <div className="relative h-[200px] bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900">
          <Skeleton className="h-full w-full" />
        </div>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const fallbackProperty: Property = {
    id: 'featured',
    refNumber: 'IERE-24205',
    transactionType: 'SALE',
    category: 'Penthouse',
    bedrooms: '4',
    bathrooms: 5,
    sizeSqft: 4500,
    priceAed: 12500000,
    district: 'Dubai Marina',
    building: 'Marina Pinnacle',
    agentName: 'Ahmed Hassan',
    status: 'Ready',
  }

  const p = property || fallbackProperty

  return (
    <Card className="overflow-hidden card-hover relative">
      {/* Shimmer glow effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Property Image Placeholder */}
      <div className="relative h-[200px] bg-gradient-to-br from-emerald-100 via-emerald-200 to-teal-100 dark:from-emerald-950 dark:via-emerald-900 dark:to-teal-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 dark:opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-white/30 dark:bg-white/10 backdrop-blur-sm p-4">
            <Building2 className="h-10 w-10 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
            Property Image
          </p>
        </div>
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={`text-[10px] px-2 py-0.5 ${
            p.transactionType === 'SALE'
              ? 'bg-emerald-600 text-white hover:bg-emerald-600'
              : 'bg-blue-600 text-white hover:bg-blue-600'
          }`}>
            {p.transactionType}
          </Badge>
          {p.status && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm">
              {p.status}
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm gap-1">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Featured
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 relative z-20">
        {/* Ref + Category */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold text-emerald-600">{p.refNumber}</span>
          <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
        </div>

        {/* Price */}
        <p className="text-2xl font-bold text-emerald-600 mb-3">
          AED {p.priceAed.toLocaleString()}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span>{p.district}{p.building ? ` · ${p.building}` : ''}</span>
        </div>

        {/* Details Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {p.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              {p.bedrooms} BR
            </span>
          )}
          {p.bathrooms && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-8 4 8M6 12h4M14 8l4 8M16 12h4M8 20h12" />
              </svg>
              {p.bathrooms} BA
            </span>
          )}
          {p.sizeSqft && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              {p.sizeSqft.toLocaleString()} sqft
            </span>
          )}
        </div>

        {/* Agent + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {p.agentName || 'IERE Agent'}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
            onClick={() => setCurrentPage('properties')}
          >
            View Details
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
