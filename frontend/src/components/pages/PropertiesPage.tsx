'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
  X,
  Bed,
  Ruler,
  MapPin,
  Download,
  GitCompareArrows,
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { PropertyDetailSheet, type Property } from '@/components/properties/PropertyDetailSheet'
import { PropertyComparison } from '@/components/properties/PropertyComparison'
import { PropertyMapGallery } from '@/components/properties/PropertyMapGallery'
import { PropertyStatsWidget } from '@/components/properties/PropertyStatsWidget'
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog'
import { InventoryGapsPanel } from '@/components/properties/InventoryGapsPanel'

// ── Constants ────────────────────────────────────────────────────────────────

const DUBAI_AREAS = [
  'Dubai Marina',
  'Downtown Dubai',
  'Palm Jumeirah',
  'Business Bay',
  'Dubai Hills Estate',
  'JVC',
  'Dubai Creek Harbour',
  'JBR',
  'DIFC',
  'Al Barsha',
  'JLT',
  'Dubai Silicon Oasis',
  'Dubai Land',
  'International City',
  'Discovery Gardens',
]

const BEDROOM_OPTIONS = ['Studio', '1', '2', '3', '4', '5+']

const CATEGORY_OPTIONS = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio']

const PAGE_SIZE = 20

const MAX_COMPARE = 3

// ── Quick Filter Presets ────────────────────────────────────────────────────

const PROPERTY_PRESETS: { id: string; label: string; icon: React.ReactNode; filterUpdate: Partial<Filters> }[] = [
  { id: 'all', label: 'All Properties', icon: <Building2 className="h-3.5 w-3.5" />, filterUpdate: {} },
  { id: 'sale', label: 'For Sale', icon: null, filterUpdate: { type: 'SALE' } },
  { id: 'rent', label: 'For Rent', icon: null, filterUpdate: { type: 'RENT' } },
  { id: 'off_plan', label: 'Off Plan', icon: null, filterUpdate: { status: 'Off Plan' } },
  { id: 'ready', label: 'Ready to Move', icon: null, filterUpdate: { status: 'Ready' } },
  { id: 'under_1m', label: 'Under AED 1M', icon: null, filterUpdate: { maxPrice: '1000000' } },
  { id: 'luxury', label: 'Luxury', icon: null, filterUpdate: { minPrice: '5000000' } },
  { id: 'apartments', label: 'Apartments', icon: null, filterUpdate: { category: 'Apartment' } },
  { id: 'villas', label: 'Villas', icon: null, filterUpdate: { category: 'Villa' } },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  search: string
  type: string
  bedrooms: string
  status: string
  category: string
  area: string
  minPrice: string
  maxPrice: string
  available: boolean | undefined
}

interface AnalyticsData {
  properties: {
    total: number
    sale: number
    rent: number
    ready: number
    offPlan: number
  }
}

interface SourceStatsData {
  direct: number
  indirect: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAed(value: number): string {
  return `AED ${value.toLocaleString()}`
}

function formatSize(value: number | null): string {
  if (!value) return '—'
  return `${value.toLocaleString()} sqft`
}

// ── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 px-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function MobileCardSkeleton() {
  return (
    <div className="grid gap-3 sm:hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-7 w-36" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Column Definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<Property>[] = [
  {
    accessorKey: 'refNumber',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Ref Number
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-emerald-600 text-mono-accent">
        {row.original.refNumber}
      </span>
    ),
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.transactionType
      return (
        <div className="flex items-center gap-1.5">
          <Badge
            className={
              type === 'SALE'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 tag-glow'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5 tag-glow'
            }
          >
            {type}
          </Badge>
          {row.original.source === 'indirect' && (
            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
              Partner
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Category
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs">{row.original.category}</span>
    ),
  },
  {
    accessorKey: 'district',
    header: 'District / Building',
    cell: ({ row }) => (
      <div className="max-w-[180px]">
        <p className="text-xs font-medium truncate">{row.original.district || '—'}</p>
        <p className="text-[10px] text-muted-foreground truncate">{row.original.building || ''}</p>
      </div>
    ),
  },
  {
    accessorKey: 'bedrooms',
    header: 'Beds',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.bedrooms || '—'}</span>
    ),
  },
  {
    accessorKey: 'sizeSqft',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Size
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs">{formatSize(row.original.sizeSqft)}</span>
    ),
  },
  {
    accessorKey: 'priceAed',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 text-xs font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Price
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-semibold">{formatAed(row.original.priceAed)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      if (!status) return <span className="text-xs text-muted-foreground">—</span>
      return (
        <Badge
          className={
            status === 'Ready'
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 tag-pill'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5 tag-pill'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'agentName',
    header: 'Agent',
    cell: ({ row }) => (
      <span className="text-xs truncate max-w-[120px] block">
        {row.original.agentName || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'available',
    header: 'Avail.',
    cell: ({ row }) => {
      const available = row.original.available
      return (
        <div className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              available ? 'bg-emerald-500' : 'bg-red-400'
            }`}
          />
          <span className="text-[10px] text-muted-foreground">
            {available ? 'Yes' : 'No'}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <PropertyActions property={row.original} />
      </div>
    ),
  },
]

// ── Inline Actions ───────────────────────────────────────────────────────────

function PropertyActions({ property }: { property: Property }) {
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-stats'] })
      toast.success(`Property ${property.refNumber} deleted`)
    },
    onError: () => {
      toast.error(`Failed to delete ${property.refNumber}`)
    },
  })

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{property.refNumber}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(property.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Mobile Property Card ─────────────────────────────────────────────────────

function PropertyCard({
  property,
  onClick,
}: {
  property: Property
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-emerald-600">
              {property.refNumber}
            </span>
            <Badge
              className={
                property.transactionType === 'SALE'
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5'
              }
            >
              {property.transactionType}
            </Badge>
            {property.source === 'indirect' && (
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                Partner
              </Badge>
            )}
          </div>
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

        <p className="text-lg font-bold text-emerald-600 mb-2">
          {formatAed(property.priceAed)}
        </p>

        <p className="text-xs text-muted-foreground mb-1">{property.category}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              {property.bedrooms}
            </span>
          )}
          {property.sizeSqft && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              {property.sizeSqft.toLocaleString()} sqft
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{property.district}{property.building ? ` · ${property.building}` : ''}</span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <span className="text-[10px] text-muted-foreground">{property.agentName || 'No agent'}</span>
          <div className="flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                property.available ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
            <span className="text-[10px]">{property.available ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Filter Section ───────────────────────────────────────────────────────────

function FilterBar({
  filters,
  setFilters,
  onManualChange,
  activeFilterCount,
  onClear,
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onManualChange: () => void
  activeFilterCount: number
  onClear: () => void
}) {
  const updateFilter = useCallback(
    (key: keyof Filters, value: string | boolean | undefined) => {
      onManualChange()
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [setFilters, onManualChange]
  )

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b rounded-lg p-4 glass-header">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onClear}>
            <X className="h-3 w-3" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Row 1: Search + Transaction Type + Bedrooms + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ref, district, building..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select
          value={filters.type}
          onValueChange={(v) => updateFilter('type', v === 'ALL' ? '' : v)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SALE">For Sale</SelectItem>
            <SelectItem value="RENT">For Rent</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.bedrooms}
          onValueChange={(v) => updateFilter('bedrooms', v === 'ALL' ? '' : v)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Bedrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Bedrooms</SelectItem>
            {BEDROOM_OPTIONS.map((b) => (
              <SelectItem key={b} value={b}>
                {b === 'Studio' ? 'Studio' : `${b} BR`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => updateFilter('status', v === 'ALL' ? '' : v)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="Ready">Ready</SelectItem>
            <SelectItem value="Off Plan">Off Plan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Category + Area + Min Price + Max Price + Available */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <Select
          value={filters.category}
          onValueChange={(v) => updateFilter('category', v === 'ALL' ? '' : v)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.area}
          onValueChange={(v) => updateFilter('area', v === 'ALL' ? '' : v)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Areas</SelectItem>
            {DUBAI_AREAS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
            AED
          </span>
          <Input
            type="number"
            placeholder="Min Price"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            className="pl-11 h-9 text-sm"
          />
        </div>

        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
            AED
          </span>
          <Input
            type="number"
            placeholder="Max Price"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="pl-11 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="available-toggle"
            checked={filters.available}
            onCheckedChange={(checked) => updateFilter('available', checked === true ? true : undefined)}
          />
          <Label htmlFor="available-toggle" className="text-sm cursor-pointer">
            Available only
          </Label>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PropertiesPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const tableAreaRef = useRef<HTMLDivElement>(null)

  // ── Filter State ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    bedrooms: '',
    status: '',
    category: '',
    area: '',
    minPrice: '',
    maxPrice: '',
    available: undefined,
  })

  const [cursor, setCursor] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table')
  const [addPropertyOpen, setAddPropertyOpen] = useState(false)
  const [propertySource, setPropertySource] = useState<'direct' | 'indirect'>('direct')

  // ── Selection State (unlimited for bulk actions) ────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  // ── Active Preset State ────────────────────────────────────────────────
  const [activePreset, setActivePreset] = useState<string>('all')

  const defaultFilters: Filters = {
    search: '',
    type: '',
    bedrooms: '',
    status: '',
    category: '',
    area: '',
    minPrice: '',
    maxPrice: '',
    available: undefined,
  }

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setCursor(null)
    setActivePreset('all')
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.type) count++
    if (filters.bedrooms) count++
    if (filters.status) count++
    if (filters.category) count++
    if (filters.area) count++
    if (filters.minPrice) count++
    if (filters.maxPrice) count++
    if (filters.available !== undefined) count++
    return count
  }, [filters])

  // Reset cursor when filters change
  const handleFilterChange = useCallback(
    (updater: React.SetStateAction<Filters>) => {
      setFilters(updater)
      setCursor(null)
    },
    []
  )

  // Clear active preset when user manually changes filters
  const handleManualFilterChange = useCallback(() => {
    setActivePreset('')
  }, [])

  // ── Preset Handler ─────────────────────────────────────────────────────
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PROPERTY_PRESETS.find((p) => p.id === presetId)
      if (!preset) return

      if (presetId === 'all') {
        clearFilters()
        return
      }

      // Reset all filters then apply preset
      setFilters({
        ...defaultFilters,
        ...preset.filterUpdate,
      })
      setCursor(null)
      setActivePreset(presetId)
    },
    [clearFilters]
  )

  // ── Build Query URL ─────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('source', propertySource)
    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
    if (filters.status) params.set('status', filters.status)
    if (filters.category) params.set('category', filters.category)
    if (filters.area) params.set('area', filters.area)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.available !== undefined) params.set('available', String(filters.available))
    if (cursor) params.set('cursor', cursor)
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [filters, cursor, propertySource])

  // ── Queries ─────────────────────────────────────────────────────────────
  const propertiesQuery = useQuery<{
    data: Property[]
    nextCursor: string | null
    total: number
  }>({
    queryKey: ['properties', queryParams],
    queryFn: () => fetch(`/api/properties?${queryParams}`).then((r) => r.json()),
  })

  const analyticsQuery = useQuery<AnalyticsData>({
    queryKey: ['analytics-stats'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
  })
  const sourceStatsQuery = useQuery<SourceStatsData>({
    queryKey: ['property-source-stats'],
    queryFn: () => fetch('/api/properties/stats').then((r) => r.json()),
  })

  const properties = propertiesQuery.data?.data ?? []
  const nextCursor = propertiesQuery.data?.nextCursor ?? null
  const totalCount = propertiesQuery.data?.total ?? 0
  const analytics = analyticsQuery.data?.properties
  const directCount = sourceStatsQuery.data?.direct ?? 0
  const indirectCount = sourceStatsQuery.data?.indirect ?? 0 // Indirect properties count

  const displayedCount = properties.length
  const currentPageStart = cursor ? displayedCount - PAGE_SIZE + 1 : 1
  const currentPageEnd = currentPageStart + displayedCount - 1

  // ── TanStack Table ──────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: properties,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // ── Selection Helpers ──────────────────────────────────────────────────
  const selectedCount = selectedIds.size
  const selectedProperties = useMemo(() => {
    return properties.filter((p) => selectedIds.has(p.id))
  }, [properties, selectedIds])
  const canCompare = selectedCount >= 2 && selectedCount <= MAX_COMPARE

  const toggleSelect = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedCount === 0 || !properties.every((p) => selectedIds.has(p.id))) {
      // Select all visible properties
      const ids = properties.map((p) => p.id)
      setSelectedIds(new Set(ids))
    } else {
      setSelectedIds(new Set())
    }
  }, [selectedCount, properties, selectedIds])

  const allInViewSelected = properties.length > 0 && properties.every((p) => selectedIds.has(p.id))

  // ── Bulk Mutations ─────────────────────────────────────────────────────
  const bulkAvailableMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/properties/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: true }),
          }).then((r) => {
            if (!r.ok) throw new Error('Failed')
            return r.json()
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} properties failed to update`)
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-stats'] })
      toast.success(`${selectedCount} properties marked as available`)
      clearSelection()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update properties')
    },
  })

  const bulkUnavailableMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/properties/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: false }),
          }).then((r) => {
            if (!r.ok) throw new Error('Failed')
            return r.json()
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} properties failed to update`)
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-stats'] })
      toast.success(`${selectedCount} properties marked as unavailable`)
      clearSelection()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update properties')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/properties/${id}`, { method: 'DELETE' }).then((r) => {
            if (!r.ok) throw new Error('Failed')
            return r.json()
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} properties failed to delete`)
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-stats'] })
      toast.success(`${selectedCount} properties deleted`)
      clearSelection()
      setShowBulkDeleteDialog(false)
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete properties')
    },
  })

  const isBulkOperating =
    bulkAvailableMutation.isPending ||
    bulkUnavailableMutation.isPending ||
    bulkDeleteMutation.isPending

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRowClick = (property: Property) => {
    setSelectedPropertyId(property.id)
    setSheetOpen(true)
  }

  const handleViewFromComparison = (property: Property) => {
    setComparisonOpen(false)
    setSelectedPropertyId(property.id)
    setSheetOpen(true)
  }

  const handleRefresh = () => {
    propertiesQuery.refetch()
    analyticsQuery.refetch()
  }

  const handleLoadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }

  const handlePreviousPage = () => {
    setCursor(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Properties
          </h1>
          <p className="text-muted-foreground">
            {propertiesQuery.isLoading ? 'Loading...' : `${totalCount} listings`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Last sync: 5 min ago
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={propertiesQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${propertiesQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center rounded-md border overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none rounded-l-md ${viewMode === 'table' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none rounded-r-md ${viewMode === 'gallery' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}
              onClick={() => setViewMode('gallery')}
              title="Gallery View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" className="gap-2 press-scale" onClick={() => setAddPropertyOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={propertiesQuery.isLoading || properties.length === 0}
            onClick={() => {
              if (properties.length === 0) return
              const headers = ['Ref', 'Type', 'Category', 'Bedrooms', 'Bathrooms', 'Size', 'Price', 'Status', 'District', 'Building', 'Agent', 'Available']
              const rows = properties.map((p) => [
                p.refNumber,
                p.transactionType,
                p.category,
                p.bedrooms || '',
                p.bathrooms || '',
                p.sizeSqft || '',
                p.priceAed,
                p.status || '',
                p.district || '',
                p.building || '',
                p.agentName || '',
                p.available ? 'Yes' : 'No',
              ])
              const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `iere-properties-${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Quick Filter Presets ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg w-fit mb-1">
        <button
          onClick={() => {
            setPropertySource('direct')
            setCursor(null)
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            propertySource === 'direct'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            Direct Properties
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              propertySource === 'direct' ? 'bg-white/20' : 'bg-muted'
            }`}>
              {directCount}
            </span>
          </span>
        </button>
        <button
          onClick={() => {
            setPropertySource('indirect')
            setCursor(null)
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            propertySource === 'indirect'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            Indirect Properties
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              propertySource === 'indirect' ? 'bg-white/20' : 'bg-muted'
            }`}>
              {indirectCount}
            </span>
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PROPERTY_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md preset-glow'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${!isActive ? 'hover-lift' : ''}`}
            >
              {preset.icon}
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* ── Property Statistics Widget ──────────────────────────────────── */}
      <PropertyStatsWidget />

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <FilterBar
        filters={filters}
        setFilters={handleFilterChange}
        onManualChange={handleManualFilterChange}
        activeFilterCount={activeFilterCount}
        onClear={clearFilters}
      />

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      {!analyticsQuery.isLoading && analytics && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-xs py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sale: {analytics.sale}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs py-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Rent: {analytics.rent}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ready: {analytics.ready}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs py-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Off Plan: {analytics.offPlan}
          </Badge>
        </div>
      )}

      {/* ── Results Count ───────────────────────────────────────────────── */}
      <div className="text-sm text-muted-foreground">
        {propertiesQuery.isLoading
          ? 'Loading properties...'
          : properties.length === 0
          ? 'No properties match your filters'
          : `Showing ${currentPageStart}–${currentPageEnd} of ${totalCount} properties`}
      </div>

      {/* ── Table / Gallery Content Area ───────────────────────────────── */}
      <div ref={tableAreaRef} className="relative">
        {/* Gallery View */}
        {viewMode === 'gallery' && !propertiesQuery.isLoading && properties.length > 0 ? (
          <PropertyMapGallery
            filters={filters}
            onOpenDetail={handleRowClick}
          />
        ) : propertiesQuery.isLoading ? (
          <>
            {!isMobile && <TableSkeleton />}
            <MobileCardSkeleton />
          </>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No properties found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try adjusting your filters or search terms
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            {!isMobile && (
              <div className="rounded-lg border table-modern">
                <Table>
                  <TableHeader className="table-header-gradient">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {/* Checkbox column */}
                        <TableHead className="w-10 px-3">
                          <Checkbox
                            checked={allInViewSelected}
                            onCheckedChange={toggleSelectAll}
                            className="rounded-[4px]"
                          />
                        </TableHead>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => {
                        const isChecked = selectedIds.has(row.original.id)
                        return (
                          <TableRow
                            key={row.id}
                            className={`cursor-pointer ${isChecked ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
                            onClick={() => handleRowClick(row.original)}
                          >
                            {/* Checkbox cell */}
                            <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelect(row.original.id)}
                                className="rounded-[4px]"
                              />
                            </TableCell>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mobile card grid */}
            <div className="grid gap-3 sm:hidden">
              {properties.map((property) => {
                const isChecked = selectedIds.has(property.id)
                return (
                  <div key={property.id} className="relative">
                    <PropertyCard
                      property={property}
                      onClick={() => handleRowClick(property)}
                    />
                    {/* Mobile checkbox overlay */}
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => toggleSelect(property.id, e)}
                    >
                      <Checkbox
                        checked={isChecked}
                        className="rounded-[4px] bg-background border-2 shadow-sm"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {currentPageStart}&ndash;{currentPageEnd} of {totalCount} properties
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!cursor}
                  onClick={handlePreviousPage}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
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
          </>
        )}

        {/* ── Bulk Action Bar (floating at bottom of table area) ─────────── */}
        {selectedCount > 0 && (
          <div className="sticky bottom-0 z-20 animate-bulk-bar-up">
            <div className="bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {selectedCount} propert{selectedCount === 1 ? 'y' : 'ies'} selected
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => bulkAvailableMutation.mutate(Array.from(selectedIds))}
                  disabled={isBulkOperating}
                >
                  {bulkAvailableMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Mark Available
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => bulkUnavailableMutation.mutate(Array.from(selectedIds))}
                  disabled={isBulkOperating}
                >
                  {bulkUnavailableMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Mark Unavailable
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-white/20 hover:bg-red-500/40 text-white border-0"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={isBulkOperating}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected
                </Button>
                {canCompare && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => setComparisonOpen(true)}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Compare ({selectedCount})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Property Detail Sheet ──────────────────────────────────────── */}
      <PropertyDetailSheet
        propertyId={selectedPropertyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* ── Property Comparison Dialog ─────────────────────────────────── */}
      {canCompare && (
        <PropertyComparison
          properties={selectedProperties.slice(0, MAX_COMPARE)}
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          onViewProperty={handleViewFromComparison}
        />
      )}

      {/* ── Bulk Delete Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Properties</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedCount} propert{selectedCount === 1 ? 'y' : 'ies'}</strong>?
              This action cannot be undone. All selected listings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkOperating}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={isBulkOperating}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedCount} Properties
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddPropertyDialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen} source={propertySource} />

      <div className="mt-6">
        <InventoryGapsPanel />
      </div>
    </div>
  )
}
