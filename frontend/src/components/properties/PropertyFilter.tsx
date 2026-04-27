'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PropertyFilters } from '@/types'

interface PropertyFilterProps {
  filters: PropertyFilters
  onChange: (next: Partial<PropertyFilters>) => void
  onClear?: () => void
}

export function PropertyFilter({
  filters,
  onChange,
  onClear,
}: PropertyFilterProps) {
  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="relative xl:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          className="pl-9"
          placeholder="Search ref, district, or building"
        />
      </div>

      <Select value={filters.area || 'all'} onValueChange={(value) => onChange({ area: value === 'all' ? '' : value })}>
        <SelectTrigger>
          <SelectValue placeholder="Area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Areas</SelectItem>
          <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
          <SelectItem value="Dubai Marina">Dubai Marina</SelectItem>
          <SelectItem value="Business Bay">Business Bay</SelectItem>
          <SelectItem value="JVC">JVC</SelectItem>
          <SelectItem value="JLT">JLT</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.bedrooms || 'all'} onValueChange={(value) => onChange({ bedrooms: value === 'all' ? '' : value })}>
        <SelectTrigger>
          <SelectValue placeholder="Bedrooms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Bedrooms</SelectItem>
          <SelectItem value="Studio">Studio</SelectItem>
          <SelectItem value="1">1 Bedroom</SelectItem>
          <SelectItem value="2">2 Bedrooms</SelectItem>
          <SelectItem value="3">3 Bedrooms</SelectItem>
          <SelectItem value="4">4 Bedrooms</SelectItem>
          <SelectItem value="5+">5+ Bedrooms</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={filters.minPrice}
        onChange={(event) => onChange({ minPrice: event.target.value })}
        placeholder="Min Price"
      />

      <Input
        value={filters.maxPrice}
        onChange={(event) => onChange({ maxPrice: event.target.value })}
        placeholder="Max Price"
      />

      <Select value={filters.type || 'all'} onValueChange={(value) => onChange({ type: value === 'all' ? '' : value })}>
        <SelectTrigger>
          <SelectValue placeholder="Transaction Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="SALE">Sale</SelectItem>
          <SelectItem value="RENT">Rent</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center justify-end">
        <Button type="button" variant="ghost" onClick={onClear} className="gap-2">
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>
    </div>
  )
}

export default PropertyFilter
