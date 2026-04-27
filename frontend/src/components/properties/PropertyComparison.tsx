'use client'

import { Children, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Property } from '@/components/properties/PropertyDetailSheet'
import {
  ArrowLeftRight,
  Bed,
  Bath,
  Ruler,
  MapPin,
  Building2,
  User,
  Eye,
  Layers,
  Hash,
  CheckCircle2,
  XCircle,
  Crown,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface PropertyComparisonProps {
  properties: Property[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewProperty: (property: Property) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAed(value: number): string {
  return `AED ${value.toLocaleString()}`
}

function formatSize(value: number | null): string {
  if (!value) return '—'
  return `${value.toLocaleString()} sqft`
}

function pricePerSqft(price: number, size: number | null): string {
  if (!size) return '—'
  return `AED ${Math.round(price / size).toLocaleString()}`
}

/** Returns the index of the "best" value in a numeric array (smallest for price, largest for size) */
function getBestIndex(values: number[], mode: 'lowest' | 'highest' = 'lowest'): number {
  const valid = values.filter((v) => v > 0)
  if (valid.length === 0) return -1
  const target = mode === 'lowest' ? Math.min(...valid) : Math.max(...valid)
  return values.indexOf(target)
}

/** Returns percentage (0-100) for visual bar width based on min/max scaling */
function getBarPercent(value: number, min: number, max: number): number {
  if (max === min) return 100
  return Math.round(((value - min) / (max - min)) * 100)
}

// ── Comparison Bar ───────────────────────────────────────────────────────────

function ComparisonBar({
  value,
  min,
  max,
  color = 'bg-emerald-500',
  darkColor = 'dark:bg-emerald-400',
  label,
  best,
}: {
  value: number
  min: number
  max: number
  color?: string
  darkColor?: string
  label: string
  best?: boolean
}) {
  const pct = getBarPercent(value, min, max)

  return (
    <div className="space-y-1">
      <div
        className={`text-xs font-semibold ${best ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
      >
        {label}
        {best && (
          <Crown className="inline h-3 w-3 ml-1 text-emerald-500" />
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color} ${darkColor}`}
          style={{ width: `${Math.max(pct, 8)}%` }}
        />
      </div>
    </div>
  )
}

// ── Comparison Row ───────────────────────────────────────────────────────────

interface ComparisonRowProps {
  icon: React.ElementType
  label: string
  values?: React.ReactNode[]
  children?: React.ReactNode
  bestIndex?: number
  alternating?: boolean
}

function ComparisonRow({ icon: Icon, label, values, children, bestIndex, alternating }: ComparisonRowProps) {
  const cells = values ?? Children.toArray(children)

  return (
    <div
      className={`grid items-center gap-0 ${
        cells.length === 2
          ? 'grid-cols-[140px_1fr_1fr] md:grid-cols-[180px_1fr_1fr]'
          : 'grid-cols-[140px_1fr_1fr_1fr] md:grid-cols-[180px_1fr_1fr_1fr]'
      } ${alternating ? 'bg-muted/40 dark:bg-muted/20' : ''}`}
    >
      {/* Label */}
      <div className="flex items-center gap-2 px-3 py-3 border-r">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      {/* Values */}
      {cells.map((v, i) => (
        <div
          key={i}
          className={`px-3 py-3 text-center ${
            i < cells.length - 1 ? 'border-r' : ''
          } ${bestIndex === i ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}
        >
          <div
            className={`text-sm ${
              bestIndex === i ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-foreground'
            }`}
          >
            {v}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Property Header Card ────────────────────────────────────────────────────

function PropertyHeader({
  property,
  onView,
}: {
  property: Property
  onView: () => void
}) {
  const isSale = property.transactionType === 'SALE'

  return (
    <Card className="border-2 border-dashed border-muted hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Ref + Type */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {property.refNumber}
          </span>
          <Badge
            className={
              isSale
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5'
            }
          >
            {property.transactionType}
          </Badge>
        </div>

        {/* Price */}
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatAed(property.priceAed)}
        </p>

        {/* Category + Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{property.category}</span>
          {property.status && (
            <Badge
              className={
                property.status === 'Ready'
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5'
              }
            >
              {property.status}
            </Badge>
          )}
        </div>

        {/* Location */}
        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">
            {property.district}
            {property.building ? ` · ${property.building}` : ''}
          </span>
        </div>

        {/* View button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={onView}
        >
          <Eye className="h-3.5 w-3.5" />
          View Property
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PropertyComparison({
  properties,
  open,
  onOpenChange,
  onViewProperty,
}: PropertyComparisonProps) {
  const count = properties.length

  // Compute comparison metrics
  const metrics = useMemo(() => {
    const sizes = properties.map((p) => p.sizeSqft ?? 0)
    const prices = properties.map((p) => p.priceAed ?? 0)
    const pricesPerSqft = properties.map((p) =>
      p.sizeSqft && p.sizeSqft > 0 ? p.priceAed / p.sizeSqft : 0
    )
    const bedrooms = properties.map((p) => {
      const b = p.bedrooms
      if (!b) return 0
      if (b.toLowerCase() === 'studio') return 0.5
      const num = parseInt(b, 10)
      return isNaN(num) ? 0 : num
    })

    return {
      sizes,
      prices,
      pricesPerSqft,
      bedrooms,
      minSize: Math.min(...sizes.filter((s) => s > 0)),
      maxSize: Math.max(...sizes),
      minPrice: Math.min(...prices.filter((p) => p > 0)),
      maxPrice: Math.max(...prices),
      minPpsf: Math.min(...pricesPerSqft.filter((p) => p > 0)),
      maxPpsf: Math.max(...pricesPerSqft),
      // Best indices: largest size, lowest price, lowest price/sqft, most bedrooms
      bestSize: getBestIndex(sizes, 'highest'),
      bestPrice: getBestIndex(prices, 'lowest'),
      bestPpsf: getBestIndex(pricesPerSqft, 'lowest'),
      bestBedrooms: getBestIndex(bedrooms, 'highest'),
    }
  }, [properties])

  if (count < 2) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-emerald-500" />
            Property Comparison
          </DialogTitle>
          <DialogDescription>
            Comparing {count} properties side by side
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 pb-6 space-y-6">
            {/* ── Property Headers ──────────────────────────────────────── */}
            <div
              className={`grid gap-4 ${
                count === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {properties.map((property) => (
                <PropertyHeader
                  key={property.id}
                  property={property}
                  onView={() => onViewProperty(property)}
                />
              ))}
            </div>

            <Separator />

            {/* ── Comparison Table ──────────────────────────────────────── */}
            <div className="rounded-lg border overflow-hidden">
              {/* Header row with property refs */}
              <div
                className={`grid items-center gap-0 bg-muted/60 dark:bg-muted/30 font-medium ${
                  count === 2
                    ? 'grid-cols-[140px_1fr_1fr] md:grid-cols-[180px_1fr_1fr]'
                    : 'grid-cols-[140px_1fr_1fr_1fr] md:grid-cols-[180px_1fr_1fr_1fr]'
                }`}
              >
                <div className="px-3 py-2.5 border-r text-xs text-muted-foreground">
                  Attribute
                </div>
                {properties.map((p, i) => (
                  <div
                    key={p.id}
                    className={`px-3 py-2.5 text-center text-xs font-mono text-emerald-600 dark:text-emerald-400 ${
                      i < count - 1 ? 'border-r' : ''
                    }`}
                  >
                    {p.refNumber}
                  </div>
                ))}
              </div>

              {/* Row: Reference + Type Badge */}
              <ComparisonRow icon={Hash} label="Reference" alternating>
                {properties.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <span className="font-mono text-xs font-semibold">{p.refNumber}</span>
                    <Badge
                      className={
                        p.transactionType === 'SALE'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5'
                      }
                    >
                      {p.transactionType}
                    </Badge>
                  </div>
                ))}
              </ComparisonRow>

              {/* Row: Category + Bedrooms/Bathrooms */}
              <ComparisonRow icon={Layers} label="Category & Rooms" bestIndex={metrics.bestBedrooms} alternating>
                {properties.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <span className="text-sm">{p.category}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.bedrooms && (
                        <span className="flex items-center gap-0.5">
                          <Bed className="h-3 w-3" />
                          {p.bedrooms}
                        </span>
                      )}
                      {p.bathrooms && (
                        <span className="flex items-center gap-0.5">
                          <Bath className="h-3 w-3" />
                          {p.bathrooms}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </ComparisonRow>

              {/* Row: Size with bar */}
              <ComparisonRow icon={Ruler} label="Size (sqft)" bestIndex={metrics.bestSize} alternating>
                {properties.map((p, i) => {
                  const size = p.sizeSqft ?? 0
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-1.5 px-1">
                      <span className="text-sm">{formatSize(p.sizeSqft)}</span>
                      <ComparisonBar
                        value={size}
                        min={metrics.minSize}
                        max={metrics.maxSize}
                        label=""
                        best={metrics.bestSize === i}
                        color="bg-emerald-500"
                        darkColor="dark:bg-emerald-400"
                      />
                    </div>
                  )
                })}
              </ComparisonRow>

              {/* Row: Price with bar */}
              <ComparisonRow icon={Hash} label="Price (AED)" bestIndex={metrics.bestPrice} alternating>
                {properties.map((p, i) => {
                  const price = p.priceAed ?? 0
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-1.5 px-1">
                      <span className="text-sm font-semibold">{formatAed(price)}</span>
                      <ComparisonBar
                        value={price}
                        min={metrics.minPrice}
                        max={metrics.maxPrice}
                        label=""
                        best={metrics.bestPrice === i}
                        color="bg-blue-500"
                        darkColor="dark:bg-blue-400"
                      />
                    </div>
                  )
                })}
              </ComparisonRow>

              {/* Row: Price per sqft */}
              <ComparisonRow icon={Hash} label="Price / sqft" bestIndex={metrics.bestPpsf} alternating>
                {properties.map((p, i) => {
                  const ppsf = p.sizeSqft && p.sizeSqft > 0 ? p.priceAed / p.sizeSqft : 0
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-1.5 px-1">
                      <span className="text-sm">{pricePerSqft(p.priceAed, p.sizeSqft)}</span>
                      {ppsf > 0 && (
                        <ComparisonBar
                          value={ppsf}
                          min={metrics.minPpsf}
                          max={metrics.maxPpsf}
                          label=""
                          best={metrics.bestPpsf === i}
                          color="bg-amber-500"
                          darkColor="dark:bg-amber-400"
                        />
                      )}
                    </div>
                  )
                })}
              </ComparisonRow>

              {/* Row: District / Building */}
              <ComparisonRow icon={MapPin} label="District / Building" alternating>
                {properties.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-0.5">
                    <span className="text-sm">{p.district || '—'}</span>
                    {p.building && (
                      <span className="text-[10px] text-muted-foreground">{p.building}</span>
                    )}
                  </div>
                ))}
              </ComparisonRow>

              {/* Row: Status */}
              <ComparisonRow icon={Building2} label="Status" alternating>
                {properties.map((p) =>
                  p.status ? (
                    <Badge
                      key={p.id}
                      className={
                        p.status === 'Ready'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5'
                      }
                    >
                      {p.status}
                    </Badge>
                  ) : (
                    <span key={p.id} className="text-sm text-muted-foreground">
                      —
                    </span>
                  )
                )}
              </ComparisonRow>

              {/* Row: Agent Name */}
              <ComparisonRow icon={User} label="Agent" alternating>
                {properties.map((p) => (
                  <span key={p.id} className="text-sm">
                    {p.agentName || '—'}
                  </span>
                ))}
              </ComparisonRow>

              {/* Row: Available */}
              <ComparisonRow icon={CheckCircle2} label="Available" alternating>
                {properties.map((p) =>
                  p.available ? (
                    <span key={p.id} className="flex items-center justify-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Available
                    </span>
                  ) : (
                    <span key={p.id} className="flex items-center justify-center gap-1 text-sm text-red-500 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      Unavailable
                    </span>
                  )
                )}
              </ComparisonRow>
            </div>

            {/* ── Legend ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-emerald-500" />
                Best value highlighted
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Size
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-full bg-blue-500 dark:bg-blue-400" />
                Price
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-full bg-amber-500 dark:bg-amber-400" />
                Price/sqft
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
