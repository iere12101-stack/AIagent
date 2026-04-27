'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Edit,
  Trash2,
  Building2,
  Bed,
  Bath,
  Ruler,
  MapPin,
  User,
  Phone,
  Hash,
  Globe,
  CalendarDays,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Property {
  id: string
  orgId: string
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
  source?: 'direct' | 'indirect'
  partnerAgency?: string | null
  partnerAgentName?: string | null
  partnerAgentPhone?: string | null
  partnerAgentEmail?: string | null
  coBrokerCommission?: string | null
  listingUrl?: string | null
  permitNumber: string | null
  portal: string | null
  listedOn: string | null
  lastUpdated: string | null
  createdAt: string
  updatedAt: string
}

interface PropertyDetailSheetProps {
  propertyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (property: Property) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAed(value: number): string {
  return `AED ${value.toLocaleString()}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Property Gallery Placeholder Generator ──────────────────────────────────

function generateGalleryImages(property: Property) {
  const type = property.category || 'Apartment'
  const beds = property.bedrooms ? `${property.bedrooms} BR` : 'Studio'
  const district = property.district || 'Dubai'
  const price = formatAed(property.priceAed)

  return [
    {
      id: 'hero',
      gradient: 'from-emerald-600 via-teal-500 to-cyan-400',
      overlay: true,
      title: price,
      subtitle: `${type} · ${beds}`,
      location: district,
    },
    {
      id: 'interior',
      gradient: 'from-emerald-500 via-emerald-400 to-teal-300',
      overlay: false,
      title: type,
      subtitle: `${beds} · ${property.bathrooms ? `${property.bathrooms} BA` : ''}`,
      location: property.building || district,
    },
    {
      id: 'exterior',
      gradient: 'from-teal-600 via-emerald-500 to-emerald-400',
      overlay: false,
      title: `${property.sizeSqft ? `${property.sizeSqft.toLocaleString()} sqft` : 'Premium'} ${type}`,
      subtitle: property.status === 'Ready' ? 'Ready to Move' : 'Off-Plan',
      location: district,
    },
  ]
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 px-4 pb-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children || <p className="text-sm font-medium">{value || '—'}</p>}
      </div>
    </div>
  )
}

// ── Image Gallery Component ─────────────────────────────────────────────────

function PropertyImageGallery({ property }: { property: Property }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  const galleryImages = generateGalleryImages(property)

  const scrollToSlide = useCallback((index: number) => {
    if (!galleryRef.current) return
    const slideWidth = galleryRef.current.clientWidth
    galleryRef.current.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
    setActiveSlide(index)
  }, [])

  const handleScroll = useCallback(() => {
    if (!galleryRef.current) return
    const scrollLeft = galleryRef.current.scrollLeft
    const slideWidth = galleryRef.current.clientWidth
    const newIndex = Math.round(scrollLeft / slideWidth)
    setActiveSlide(newIndex)
  }, [])

  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Navigation Arrows */}
        <div className="absolute inset-y-0 left-0 z-10 flex items-center">
          <button
            onClick={() => scrollToSlide(Math.max(0, activeSlide - 1))}
            disabled={activeSlide === 0}
            className="ml-1.5 p-1.5 rounded-full bg-background/80 dark:bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background transition-opacity disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 z-10 flex items-center">
          <button
            onClick={() => scrollToSlide(Math.min(galleryImages.length - 1, activeSlide + 1))}
            disabled={activeSlide === galleryImages.length - 1}
            className="mr-1.5 p-1.5 rounded-full bg-background/80 dark:bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background transition-opacity disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Gallery */}
        <div
          ref={galleryRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto property-gallery rounded-xl"
        >
          {galleryImages.map((img, i) => (
            <div
              key={img.id}
              className={`relative flex-shrink-0 w-full h-48 snap-center rounded-xl bg-gradient-to-br ${img.gradient} overflow-hidden`}
            >
              {/* Decorative Building SVG Pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
                <rect x="10" y="30" width="20" height="70" rx="2" fill="white" />
                <rect x="15" y="35" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="22" y="35" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="15" y="45" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="22" y="45" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="15" y="55" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="22" y="55" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="40" y="15" width="25" height="85" rx="2" fill="white" />
                <rect x="45" y="20" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="52" y="20" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="45" y="30" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="52" y="30" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="45" y="40" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="52" y="40" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="45" y="50" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="52" y="50" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="75" y="40" width="30" height="60" rx="2" fill="white" />
                <rect x="80" y="45" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="90" y="45" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="80" y="55" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="90" y="55" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="80" y="65" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="90" y="65" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                <rect x="115" y="20" width="22" height="80" rx="2" fill="white" />
                <rect x="120" y="25" width="3" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="126" y="25" width="3" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="120" y="33" width="3" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="126" y="33" width="3" height="3" rx="1" fill="white" opacity="0.5" />
                <rect x="150" y="35" width="28" height="65" rx="2" fill="white" />
                <rect x="155" y="40" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="165" y="40" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="155" y="50" width="4" height="4" rx="1" fill="white" opacity="0.5" />
                <rect x="165" y="50" width="4" height="4" rx="1" fill="white" opacity="0.5" />
              </svg>

              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white/90" />
                </div>
              </div>

              {/* Price Overlay (first slide) */}
              {img.overlay && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              )}

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {img.overlay ? (
                  <div>
                    <p className="text-2xl font-bold text-white drop-shadow-md">{img.title}</p>
                    <p className="text-sm text-white/80 mt-0.5">{img.subtitle}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-white/60" />
                      <span className="text-xs text-white/60">{img.location}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-white drop-shadow-md">{img.title}</p>
                    <p className="text-xs text-white/70 mt-0.5">{img.subtitle}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-white/50" />
                      <span className="text-xs text-white/50">{img.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slide Number Badge */}
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 text-[10px] font-medium bg-black/30 text-white/80 rounded-full backdrop-blur-sm">
                  {i + 1}/{galleryImages.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5">
        {galleryImages.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToSlide(i)}
            className={`gallery-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/30 ${
              i === activeSlide ? 'active' : ''
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PropertyDetailSheet({
  propertyId,
  open,
  onOpenChange,
  onEdit,
}: PropertyDetailSheetProps) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<{ data: Property }>({
    queryKey: ['property', propertyId],
    queryFn: () => fetch(`/api/properties/${propertyId}`).then((r) => r.json()),
    enabled: !!propertyId && open,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      onOpenChange(false)
    },
  })

  const toggleAvailableMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
    },
  })

  const property = data?.data

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Details
          </SheetTitle>
          {isLoading ? (
            <div className="mt-2">
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <SheetDescription>
              {property ? `Ref: ${property.refNumber}` : null}
            </SheetDescription>
          )}
        </SheetHeader>

        {isLoading ? (
          <DetailSkeleton />
        ) : error || !property ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">Failed to load property details.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-5 px-4 pb-4" key={property.id}>
            {/* ── Image Gallery ──────────────────────────────────────────── */}
            <PropertyImageGallery property={property} />

            <Separator />

            {/* Price */}
            <div>
              <p className="text-3xl font-bold text-emerald-600">
                {formatAed(property.priceAed)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={
                    property.transactionType === 'SALE'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                  }
                >
                  {property.transactionType}
                </Badge>
                {property.status && (
                  <Badge
                    className={
                      property.status === 'Ready'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
                    }
                  >
                    {property.status}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Property Details Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow icon={Layers} label="Category" value={property.category} />
              <DetailRow icon={Bed} label="Bedrooms" value={property.bedrooms} />
              <DetailRow icon={Bath} label="Bathrooms" value={property.bathrooms} />
              <DetailRow
                icon={Ruler}
                label="Size"
                value={property.sizeSqft ? `${property.sizeSqft.toLocaleString()} sqft` : null}
              />
              <DetailRow icon={MapPin} label="District" value={property.district} />
              <DetailRow icon={Building2} label="Building" value={property.building} />
              <DetailRow icon={MapPin} label="Full Area" value={property.fullArea} />
              <DetailRow icon={Hash} label="Permit No." value={property.permitNumber} />
            </div>

            <Separator />

            {/* Agent */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Agent</p>
              <DetailRow icon={User} label="Name" value={property.agentName} />
              <DetailRow icon={Phone} label="WhatsApp" value={property.agentWhatsapp}>
                {property.agentWhatsapp ? (
                  <a
                    href={`https://wa.me/${property.agentWhatsapp.replace(/[^0-9+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-emerald-600 hover:underline"
                  >
                    {property.agentWhatsapp}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">&mdash;</p>
                )}
              </DetailRow>
            </div>

            <Separator />

            {/* Dates & Portal */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow icon={CalendarDays} label="Listed On" value={formatDate(property.listedOn)} />
              <DetailRow icon={Clock} label="Last Updated" value={formatDate(property.lastUpdated)} />
              <DetailRow icon={Globe} label="Portal" value={property.portal} />
            </div>

            <Separator />

            {/* Availability */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">
                  {property.available ? 'This property is currently available' : 'This property is unavailable'}
                </p>
              </div>
              <Switch
                checked={property.available}
                disabled={toggleAvailableMutation.isPending}
                onCheckedChange={(checked) =>
                  toggleAvailableMutation.mutate({ id: property.id, available: checked })
                }
              />
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {onEdit && (
                <Button
                  className="gap-2"
                  onClick={() => onEdit(property)}
                >
                  <Edit className="h-4 w-4" />
                  Edit Property
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 w-full" disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Property'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Property</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{property.refNumber}</strong>? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(property.id)}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
