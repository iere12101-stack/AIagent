'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BedDouble, Building2, MapPin, Phone, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ROICalculator } from '@/components/properties/ROICalculator'

interface PropertyDetail {
  id: string
  refNumber: string
  transactionType: string
  category: string
  bedrooms: string | null
  bathrooms: string | null
  sizeSqft: number | null
  status: string | null
  district: string | null
  building: string | null
  fullArea: string | null
  priceAed: number
  agentName: string | null
  agentWhatsapp: string | null
  available: boolean
}

function formatCurrency(value: number): string {
  return `AED ${value.toLocaleString()}`
}

export function PropertyDetailRoute({ propertyRef }: { propertyRef: string }) {
  const propertyQuery = useQuery<{ data: PropertyDetail }>({
    queryKey: ['property-detail-page', propertyRef],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyRef)}`)
      if (!response.ok) {
        throw new Error('Failed to load property')
      }
      return response.json()
    },
  })

  const property = propertyQuery.data?.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
            <Link href="/properties">
              <ArrowLeft className="h-4 w-4" />
              Back to properties
            </Link>
          </Button>
          <h1 className="text-display">Property Detail</h1>
          <p className="text-subtitle">
            Live listing detail with pricing, location, agent ownership, and ROI context.
          </p>
        </div>
        {property ? (
          <Badge variant={property.available ? 'default' : 'secondary'} className="w-fit">
            {property.available ? 'Available' : 'Unavailable'}
          </Badge>
        ) : null}
      </div>

      {propertyQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : property ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  {property.refNumber}
                </CardTitle>
                <CardDescription>
                  {property.category} in {property.district || 'Dubai'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(property.priceAed)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{property.transactionType}</Badge>
                  {property.status ? <Badge variant="outline">{property.status}</Badge> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BedDouble className="h-4 w-4" />
                      Rooms
                    </div>
                    <div className="mt-2 font-semibold">
                      {property.bedrooms || 'N/A'} beds - {property.bathrooms || 'N/A'} baths
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Ruler className="h-4 w-4" />
                      Size
                    </div>
                    <div className="mt-2 font-semibold">
                      {property.sizeSqft ? `${property.sizeSqft.toLocaleString()} sqft` : 'N/A'}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <div className="mt-2 font-semibold">
                      {[property.building, property.fullArea, property.district]
                        .filter(Boolean)
                        .join(' - ') || 'Location unavailable'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Ownership</CardTitle>
                <CardDescription>Listing assignment and direct contact context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Assigned Agent</div>
                  <div className="mt-2 text-lg font-semibold">
                    {property.agentName || 'Unassigned'}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Agent WhatsApp
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {property.agentWhatsapp || 'Not available'}
                  </div>
                </div>
                <div className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
                  This route resolves the property directly from the live properties API so it can
                  be linked from inbox matches, contact detail pages, and comparison workflows.
                </div>
              </CardContent>
            </Card>
          </div>

          <ROICalculator
            initialPrice={property.priceAed}
            district={property.district}
            sizeSqft={property.sizeSqft}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Property not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
