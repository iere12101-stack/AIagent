'use client'

import type { PropertyRecord } from '@/types'
import { PropertyCard } from './PropertyCard'

interface PropertyCarouselProps {
  properties: PropertyRecord[]
  emptyMessage?: string
  onSelectProperty?: (property: PropertyRecord) => void
}

export function PropertyCarousel({
  properties,
  emptyMessage = 'No matching properties yet.',
  onSelectProperty,
}: PropertyCarouselProps) {
  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {properties.map((property) => (
        <div key={property.id} className="min-w-[280px] max-w-[320px] flex-1">
          <PropertyCard
            property={property}
            compact
            href={`/properties/${encodeURIComponent(property.refNumber)}`}
            onSelect={onSelectProperty}
          />
        </div>
      ))}
    </div>
  )
}

export default PropertyCarousel
