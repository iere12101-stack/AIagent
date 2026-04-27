'use client'

import { useQuery } from '@tanstack/react-query'
import { Bath, Bed, MapPin, RefreshCw, Square, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PropertyMatch {
  ref: string
  ref_number?: string | null
  transaction_type?: 'SALE' | 'RENT' | null
  category?: string | null
  bedrooms?: string | null
  bathrooms?: string | null
  size_sqft?: number | null
  status?: string | null
  district: string
  building?: string | null
  price_aed: number
  agent_name?: string | null
  available?: boolean | null
}

export function PropertyMatchPanel({ contactId }: { contactId: string }) {
  const { data, isLoading, refetch, isFetching } = useQuery<PropertyMatch[]>({
    queryKey: ['property-matches', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/contacts/${contactId}/property-matches`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch property matches')
      }

      const payload = (await response.json()) as { data?: PropertyMatch[] } | PropertyMatch[]
      return Array.isArray(payload) ? payload : payload.data ?? []
    },
    enabled: Boolean(contactId),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="border-t border-white/[0.06] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Matched Properties</span>
          <span className="rounded border border-[#25D453]/20 bg-[#25D453]/10 px-1.5 py-0.5 text-[9px] text-[#25D453]">
            {data?.length ?? 0} live
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-white/30 hover:bg-white/[0.06] hover:text-white"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.slice(0, 3).map((property) => {
            const reference = property.ref_number || property.ref
            const transactionType = property.transaction_type || (property.category?.toLowerCase() === 'rent' ? 'RENT' : 'SALE')
            return (
              <div
                key={reference}
                className="cursor-default rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/40">{reference}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                      transactionType === 'SALE' ? 'bg-blue-500/10 text-blue-300' : 'bg-[#25D453]/10 text-[#25D453]',
                    )}
                  >
                    {transactionType}
                  </span>
                </div>
                <p className="mb-1 text-sm font-bold text-[#e8f0e8]">AED {Number(property.price_aed).toLocaleString()}</p>
                <div className="mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-white/30" />
                  <span className="truncate text-[11px] text-white/50">
                    {property.district}
                    {property.building ? ` - ${property.building}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {property.bedrooms === 'Studio' ? 'Studio' : `${property.bedrooms ?? '-'} BR`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-3 w-3" />
                    {property.bathrooms ?? '-'}
                  </span>
                  {property.size_sqft ? (
                    <span className="flex items-center gap-1">
                      <Square className="h-3 w-3" />
                      {Number(property.size_sqft).toLocaleString()} sqft
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2">
                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                    <User className="h-3 w-3" />
                    {property.agent_name || 'Unassigned'}
                  </span>
                  {property.available ? (
                    <span className="text-[9px] text-[#25D453]">Available for matching</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-[11px] text-white/30">No matching properties found</p>
      )}
    </div>
  )
}
