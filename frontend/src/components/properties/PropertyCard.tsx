'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Bath, BedDouble, MapPin, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PropertyRecord } from '@/types'

function formatCurrency(value: number): string {
  return `AED ${value.toLocaleString()}`
}

interface PropertyCardProps {
  property: PropertyRecord
  compact?: boolean
  href?: string
  footer?: ReactNode
  className?: string
  onSelect?: (property: PropertyRecord) => void
}

function PropertyCardBody({
  property,
  compact = false,
  footer,
}: Omit<PropertyCardProps, 'href' | 'className' | 'onSelect'>) {
  return (
    <CardContent className={cn('space-y-3 p-4', compact && 'p-3')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-emerald-600">
            {property.refNumber}
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {formatCurrency(property.priceAed)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline">{property.transactionType}</Badge>
          {property.status ? <Badge variant="outline">{property.status}</Badge> : null}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{property.category}</p>
        <p className="text-xs text-muted-foreground">
          {[property.building, property.district].filter(Boolean).join(' - ') || 'Dubai'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
        <span className="flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5" />
          {property.bedrooms || 'N/A'}
        </span>
        <span className="flex items-center gap-1.5">
          <Bath className="h-3.5 w-3.5" />
          {property.bathrooms || 'N/A'}
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5" />
          {property.sizeSqft ? `${property.sizeSqft.toLocaleString()} sqft` : 'N/A'}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {property.district || 'Area TBD'}
        </span>
      </div>

      {footer ? (
        <div className="border-t pt-3">{footer}</div>
      ) : (
        <div className="border-t pt-3 text-xs text-muted-foreground">
          {property.available ? 'Available for matching' : 'Currently unavailable'}
        </div>
      )}
    </CardContent>
  )
}

export function PropertyCard({
  property,
  compact = false,
  href,
  footer,
  className,
  onSelect,
}: PropertyCardProps) {
  const content = (
    <Card
      className={cn(
        'transition-colors hover:border-emerald-300 dark:hover:border-emerald-700',
        (href || onSelect) && 'cursor-pointer',
        className,
      )}
      onClick={() => onSelect?.(property)}
    >
      <PropertyCardBody property={property} compact={compact} footer={footer} />
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

export default PropertyCard
