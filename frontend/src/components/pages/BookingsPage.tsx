'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Plus,
  Search,
  Eye,
  X,
  Clock,
  MapPin,
  Phone,
  User,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
  Send,
  CalendarClock,
  Ban,
  MessageSquare,
  LayoutList,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { CreateBookingDialog } from '@/components/bookings/CreateBookingDialog'
import { BookingCalendar } from '@/components/bookings/BookingCalendar'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
  }
  if (digits.length === 10) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }
  return phone
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '—'
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getBookingStatusColor(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
    case 'cancelled': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    case 'no_show': return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
}

function getBookingStatusIcon(status: string) {
  switch (status) {
    case 'scheduled': return <CalendarClock className="h-3 w-3" />
    case 'confirmed': return <CheckCircle className="h-3 w-3" />
    case 'completed': return <CheckCircle className="h-3 w-3" />
    case 'cancelled': return <XCircle className="h-3 w-3" />
    case 'no_show': return <Ban className="h-3 w-3" />
    default: return <AlertCircle className="h-3 w-3" />
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  orgId: string
  contactId: string
  conversationId: string | null
  agentName: string | null
  agentWhatsapp: string | null
  propertyRef: string | null
  propertyArea: string | null
  scheduledDate: string
  scheduledTime: string
  duration: number | null
  status: string
  notes: string | null
  createdAt: string
  contact: {
    name: string | null
    phone: string
  } | null
}

interface BookingSummary {
  totalBookings: number
  scheduledBookings: number
  completedBookings: number
  cancelledBookings: number
  [key: string]: unknown
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyBookings({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No bookings found</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-4">
        Try adjusting your filters or date range to find bookings.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        <X className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BookingsPage() {
  const queryClient = useQueryClient()
  const { setSelectedContact } = useAppStore()

  // ── Filter State ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [createBookingOpen, setCreateBookingOpen] = useState(false)

  const hasFilters = status !== 'all' || fromDate || toDate

  const clearFilters = useCallback(() => {
    setStatus('all')
    setFromDate('')
    setToDate('')
    setCursor(null)
  }, [])

  // ── Queries ───────────────────────────────────────────────────────────
  const analyticsQuery = useQuery<{ data: BookingSummary }>({
    queryKey: ['analytics-bookings'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 60000,
  })

  const bookingsQuery = useQuery<{ data: Booking[]; nextCursor: string | null; total: number }>({
    queryKey: ['bookings', status, fromDate, toDate, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20' })
      if (status !== 'all') params.set('status', status)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (cursor) params.set('cursor', cursor)
      return fetch(`/api/bookings?${params}`).then((r) => r.json())
    },
  })

  const allBookings = bookingsQuery.data?.data ?? []
  const nextCursor = bookingsQuery.data?.nextCursor ?? null
  const total = bookingsQuery.data?.total ?? 0

  // Individual booking for detail sheet
  const bookingDetailQuery = useQuery<{ data: Booking }>({
    queryKey: ['booking-detail', selectedBookingId],
    queryFn: () => fetch(`/api/bookings/${selectedBookingId}`).then((r) => r.json()),
    enabled: !!selectedBookingId && sheetOpen,
  })

  // ── Mutations ─────────────────────────────────────────────────────────
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking-detail', selectedBookingId] })
      queryClient.invalidateQueries({ queryKey: ['analytics-bookings'] })
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleViewBooking = useCallback((booking: Booking) => {
    setSelectedBookingId(booking.id)
    setEditNotes(booking.notes || '')
    setSheetOpen(true)
  }, [])

  const handleUpdateStatus = useCallback((bookingId: string, newStatus: string) => {
    updateBookingMutation.mutate({ id: bookingId, data: { status: newStatus } })
  }, [updateBookingMutation])

  const handleSaveNotes = useCallback(() => {
    if (selectedBookingId && editNotes !== (bookingDetailQuery.data?.data?.notes || '')) {
      updateBookingMutation.mutate({ id: selectedBookingId, data: { notes: editNotes } })
    }
  }, [selectedBookingId, editNotes, bookingDetailQuery.data?.data?.notes, updateBookingMutation])

  const handleNavigateToContact = useCallback((contactId: string) => {
    setSelectedContact(contactId)
    setSheetOpen(false)
  }, [setSelectedContact])

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }, [nextCursor])

  const bookingDetail = bookingDetailQuery.data?.data ?? null
  const analytics = analyticsQuery.data?.data ?? null

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            {viewMode === 'calendar' ? 'Calendar View' : 'List View'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-none px-3 ${viewMode === 'list' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-none px-3 ${viewMode === 'calendar' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white press-scale" onClick={() => setCreateBookingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Booking</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analyticsQuery.isLoading ? (
        <SummaryCardsSkeleton />
      ) : analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.totalBookings}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Total Bookings</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2">
                  <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.scheduledBookings}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Scheduled</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.completedBookings}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Completed</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-red-100 dark:bg-red-950 p-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.cancelledBookings}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Cancelled</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filter Bar - only show in list view */}
      {viewMode === 'list' && (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Select value={status} onValueChange={(v) => { setStatus(v); setCursor(null) }}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCursor(null) }}
              className="w-[160px] h-9"
              placeholder="From"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCursor(null) }}
              className="w-[160px] h-9"
              placeholder="To"
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <BookingCalendar />
      ) : (
      <>
      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block table-modern">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Contact</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsQuery.isLoading && cursor === null ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <TableSkeleton />
                    </TableCell>
                  </TableRow>
                ) : allBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyBookings onClear={clearFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  allBookings.map((booking) => {
                    const contactName = booking.contact?.name || booking.contact?.phone || 'Unknown'
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={`${getAvatarColor(booking.contactId)} text-[10px] font-semibold`}>
                                {getInitials(contactName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[140px]">{contactName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {booking.agentName || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-mono-accent">
                            {booking.propertyRef || '—'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
                            {booking.propertyArea || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(booking.scheduledDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatTime(booking.scheduledTime)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatDuration(booking.duration)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize gap-1 tag-pill ${getBookingStatusColor(booking.status)}`}>
                            {getBookingStatusIcon(booking.status)}
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewBooking(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                  Confirm
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'completed')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                                  Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'cancelled')}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                  Cancel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'no_show')}>
                                  <Ban className="h-4 w-4 mr-2 text-gray-500" />
                                  No Show
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3">
            {bookingsQuery.isLoading && cursor === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : allBookings.length === 0 ? (
              <EmptyBookings onClear={clearFilters} />
            ) : (
              allBookings.map((booking) => {
                const contactName = booking.contact?.name || booking.contact?.phone || 'Unknown'
                return (
                  <button
                    key={booking.id}
                    onClick={() => handleViewBooking(booking)}
                    className="w-full p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`${getAvatarColor(booking.contactId)} text-xs font-semibold`}>
                            {getInitials(contactName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{contactName}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] capitalize gap-1 ${getBookingStatusColor(booking.status)}`}>
                        {getBookingStatusIcon(booking.status)}
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDate(booking.scheduledDate)}</span>
                      <span>{formatTime(booking.scheduledTime)}</span>
                      <span>{formatDuration(booking.duration)}</span>
                    </div>
                    {booking.agentName && (
                      <p className="text-xs text-muted-foreground mt-1">Agent: {booking.agentName}</p>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {allBookings.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {allBookings.length} of {total}
              </span>
              {nextCursor ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={bookingsQuery.isLoading}
                >
                  {bookingsQuery.isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">End of results</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      </>
      )}

      {/* Create Booking Dialog */}
      <CreateBookingDialog open={createBookingOpen} onOpenChange={setCreateBookingOpen} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Booking Detail Sheet                                                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedBookingId(null) }}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Booking Details</SheetTitle>
            <SheetDescription>View and manage booking information</SheetDescription>
          </SheetHeader>

          {bookingDetailQuery.isLoading ? (
            <div className="space-y-4 px-4 pt-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : bookingDetail ? (
            <div className="space-y-6 px-4 pt-2 pb-6">
              {/* Header with Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Booking Details</h2>
                  <Badge variant="outline" className={`text-xs capitalize gap-1 mt-1 ${getBookingStatusColor(bookingDetail.status)}`}>
                    {getBookingStatusIcon(bookingDetail.status)}
                    {bookingDetail.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Contact
                </h4>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${getAvatarColor(bookingDetail.contactId)} text-sm font-semibold`}>
                      {getInitials(bookingDetail.contact?.name || bookingDetail.contact?.phone || '??')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{bookingDetail.contact?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      {formatPhone(bookingDetail.contact?.phone || '')}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleNavigateToContact(bookingDetail.contactId)}
                  >
                    <User className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>

              {/* Property Info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Property
                </h4>
                {bookingDetail.propertyRef ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm font-mono font-bold">{bookingDetail.propertyRef}</code>
                    </div>
                    {bookingDetail.propertyArea && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{bookingDetail.propertyArea}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No property linked</p>
                )}
              </div>

              {/* Agent Info */}
              {bookingDetail.agentName && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Agent
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{bookingDetail.agentName}</span>
                  </div>
                  {bookingDetail.agentWhatsapp && (
                    <a
                      href={`https://wa.me/${bookingDetail.agentWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 hover:underline mt-1.5"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhone(bookingDetail.agentWhatsapp)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Schedule Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Date</span>
                  </div>
                  <p className="text-sm font-medium">{formatDate(bookingDetail.scheduledDate)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Time</span>
                  </div>
                  <p className="text-sm font-medium">{formatTime(bookingDetail.scheduledTime)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Duration</span>
                  </div>
                  <p className="text-sm font-medium">{formatDuration(bookingDetail.duration)}</p>
                </div>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Status Timeline
                </h4>
                {(() => {
                  const steps = [
                    { label: 'Booking Created', icon: CalendarDays, dotColor: 'bg-gray-400' },
                    { label: 'Confirmed by Agent', icon: CheckCircle, dotColor: 'bg-amber-500' },
                    { label: 'Viewing Completed', icon: Eye, dotColor: 'bg-emerald-500' },
                    { label: 'Follow-up Sent', icon: Send, dotColor: 'bg-blue-500' },
                  ]
                  let currentStep = 0
                  if (bookingDetail.status === 'confirmed' || bookingDetail.status === 'cancelled') currentStep = 1
                  else if (bookingDetail.status === 'no_show') currentStep = 2
                  else if (bookingDetail.status === 'completed') currentStep = 3

                  const created = new Date(bookingDetail.createdAt).getTime()
                  const timestamps = [
                    formatDate(bookingDetail.createdAt),
                    currentStep >= 1 ? formatDate(new Date(created + 3600000).toISOString()) : null,
                    currentStep >= 2 ? formatDate(new Date(created + 86400000).toISOString()) : null,
                    currentStep >= 3 ? formatDate(new Date(created + 172800000).toISOString()) : null,
                  ]

                  return (
                    <div className="relative ml-1">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
                      {steps.map((step, i) => {
                        const isPast = i < currentStep
                        const isCurrent = i === currentStep
                        const isFuture = i > currentStep
                        const Icon = step.icon
                        const dotClasses = [
                          'relative z-10 mt-0.5 h-4 w-4 rounded-full border-[3px] border-background shrink-0',
                          (isPast || isCurrent) ? step.dotColor : 'bg-gray-300 dark:bg-gray-600',
                          isCurrent ? 'animate-pulse' : '',
                        ].filter(Boolean).join(' ')
                        return (
                          <div key={step.label} className="relative flex items-start gap-3 pb-6 last:pb-0">
                            <div className={dotClasses} />
                            <div className={`flex-1 min-w-0 ${isFuture ? 'opacity-40' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${isFuture ? 'text-muted-foreground' : 'text-foreground'}`} />
                                <span className={`text-sm font-medium ${isFuture ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {step.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                {timestamps[i] || (isCurrent ? 'In progress...' : isFuture ? 'Upcoming' : '')}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notes
                </h4>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Add notes about this booking..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              <Separator />

              {/* Status Update Buttons */}
              {bookingDetail.status === 'scheduled' && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Update Status
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'confirmed')}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'completed')}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'cancelled')}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {bookingDetail.status === 'confirmed' && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Update Status
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'completed')}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'cancelled')}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
                      onClick={() => handleUpdateStatus(bookingDetail.id, 'no_show')}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      No Show
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Reminder
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleNavigateToContact(bookingDetail.contactId)}
                >
                  <MessageSquare className="h-4 w-4" />
                  View Contact Conversation
                </Button>
              </div>

              {/* Created At */}
              <p className="text-xs text-muted-foreground text-center">
                Created {formatDate(bookingDetail.createdAt)}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No booking selected</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
