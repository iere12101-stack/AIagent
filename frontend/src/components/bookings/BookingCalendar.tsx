'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  MapPin,
  User,
  Building2,
  Phone,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'

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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    case 'no_show':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-500'
    case 'confirmed': return 'bg-emerald-500'
    case 'completed': return 'bg-green-500'
    case 'cancelled': return 'bg-red-500'
    case 'no_show': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'scheduled': return <Calendar className="h-3 w-3" />
    case 'confirmed': return <CheckCircle className="h-3 w-3" />
    case 'completed': return <CheckCircle className="h-3 w-3" />
    case 'cancelled': return <XCircle className="h-3 w-3" />
    case 'no_show': return <Ban className="h-3 w-3" />
    default: return <Calendar className="h-3 w-3" />
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Calendar Utilities ───────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  // Convert from Sunday=0 to Monday=0
  return day === 0 ? 6 : day - 1
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// ── Booking Pill Component ───────────────────────────────────────────────────

function BookingPill({ booking }: { booking: Booking }) {
  const contactName = booking.contact?.name || booking.contact?.phone || 'Unknown'
  const label = `${formatTime(booking.scheduledTime)} ${contactName.split(' ')[0]}`
  const title = `${formatTime(booking.scheduledTime)} — ${contactName}${booking.propertyRef ? ` — ${booking.propertyRef}` : ''} [${booking.status.replace('_', ' ')}]`

  return (
    <div
      className={`text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded truncate cursor-default ${getStatusColor(booking.status)}`}
      title={title}
    >
      {label}
    </div>
  )
}

// ── Day Cell Component ───────────────────────────────────────────────────────

function DayCell({
  day,
  month,
  year,
  bookings,
  isCurrentMonth,
  isSelected,
  onClick,
}: {
  day: number
  month: number
  year: number
  bookings: Booking[]
  isCurrentMonth: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const date = new Date(year, month, day)
  const today = isToday(date)
  const hasBookings = bookings.length > 0
  const maxVisible = 3
  const visibleBookings = bookings.slice(0, maxVisible)
  const overflowCount = bookings.length - maxVisible

  // Count bookings by status for dot indicators
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    return counts
  }, [bookings])

  return (
    <button
      onClick={onClick}
      className={`
        relative min-h-[90px] lg:min-h-[110px] p-1.5 text-left border transition-colors
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50
        ${!isCurrentMonth ? 'bg-muted/30 border-muted' : 'bg-background border-border'}
        ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
        ${hasBookings && isCurrentMonth ? 'hover:bg-accent/50' : ''}
        ${today && !isSelected ? 'ring-2 ring-emerald-400 border-emerald-400' : ''}
      `}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`
            text-xs font-semibold
            ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
            ${today ? 'bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
          `}
        >
          {day}
        </span>
        {/* Status dot indicators */}
        {hasBookings && (
          <div className="flex gap-0.5">
            {Object.entries(statusCounts).map(([status]) => (
              <span
                key={status}
                className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(status)}`}
                title={`${status.replace('_', ' ')}: ${statusCounts[status]}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking pills */}
      <div className="space-y-0.5">
        {visibleBookings.map((booking) => (
          <BookingPill key={booking.id} booking={booking} />
        ))}
        {overflowCount > 0 && (
          <div className="text-[10px] text-muted-foreground font-medium px-1.5">
            +{overflowCount} more
          </div>
        )}
      </div>
    </button>
  )
}

// ── Calendar Skeleton ────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-[90px] lg:h-[110px] w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Day Detail Panel Content ─────────────────────────────────────────────────

function DayDetailContent({
  date,
  bookings,
  isLoading,
  onUpdateStatus,
  onNavigateToContact,
}: {
  date: Date
  bookings: Booking[]
  isLoading: boolean
  onUpdateStatus: (id: string, status: string) => void
  onNavigateToContact: (contactId: string) => void
}) {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No bookings</h3>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          There are no bookings scheduled for this day.
        </p>
      </div>
    )
  }

  // Sort bookings by time
  const sortedBookings = [...bookings].sort((a, b) => {
    if (!a.scheduledTime || !b.scheduledTime) return 0
    return a.scheduledTime.localeCompare(b.scheduledTime)
  })

  return (
    <div className="space-y-4 px-4 pt-2 pb-6">
      <div>
        <h2 className="text-lg font-semibold">{dateStr}</h2>
        <p className="text-sm text-muted-foreground">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        {sortedBookings.map((booking) => {
          const contactName = booking.contact?.name || booking.contact?.phone || 'Unknown'
          return (
            <div
              key={booking.id}
              className="rounded-lg border p-4 space-y-3 hover:bg-accent/30 transition-colors"
            >
              {/* Time + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {formatTime(booking.scheduledTime)}
                  </span>
                  {booking.duration && (
                    <span className="text-xs text-muted-foreground">
                      ({formatDuration(booking.duration)})
                    </span>
                  )}
                </div>
                <Badge variant="outline" className={`text-xs capitalize gap-1 ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-2">
                <div className={`rounded-full p-1.5 ${getAvatarColor(booking.contactId)}`}>
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contactName}</p>
                  {booking.contact?.phone && (
                    <p className="text-xs text-muted-foreground">{formatPhone(booking.contact.phone)}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => onNavigateToContact(booking.contactId)}
                >
                  View
                </Button>
              </div>

              {/* Property */}
              {booking.propertyRef && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <code className="text-xs font-mono font-bold">{booking.propertyRef}</code>
                  {booking.propertyArea && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="text-xs truncate">{booking.propertyArea}</span>
                    </>
                  )}
                </div>
              )}

              {/* Agent */}
              {booking.agentName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs truncate">{booking.agentName}</span>
                </div>
              )}

              {/* Quick Actions */}
              {(booking.status === 'scheduled' || booking.status === 'confirmed') && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                    onClick={() => onUpdateStatus(booking.id, 'completed')}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                    onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                  >
                    <XCircle className="h-3 w-3" />
                    Cancel
                  </Button>
                  {(booking.status === 'confirmed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1 border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
                      onClick={() => onUpdateStatus(booking.id, 'no_show')}
                    >
                      <Ban className="h-3 w-3" />
                      No Show
                    </Button>
                  )}
                  {(booking.status === 'scheduled') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                      onClick={() => onUpdateStatus(booking.id, 'confirmed')}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Confirm
                    </Button>
                  )}
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{booking.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mobile Date List ─────────────────────────────────────────────────────────

function MobileDateList({
  year,
  month,
  bookingsByDate,
  isLoading,
  onDayClick,
}: {
  year: number
  month: number
  bookingsByDate: Record<string, Booking[]>
  isLoading: boolean
  onDayClick: (day: number) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)

  const daysWithBookings = useMemo(() => {
    const days: number[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toDateKey(new Date(year, month, d))
      if (bookingsByDate[key] && bookingsByDate[key].length > 0) {
        days.push(d)
      }
    }
    return days
  }, [year, month, daysInMonth, bookingsByDate])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (daysWithBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No bookings this month</h3>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          There are no bookings scheduled for {MONTH_NAMES[month]} {year}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      {daysWithBookings.map((day) => {
        const date = new Date(year, month, day)
        const key = toDateKey(date)
        const dayBookings = bookingsByDate[key] || []
        const dateLabel = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

        return (
          <button
            key={day}
            onClick={() => onDayClick(day)}
            className="w-full rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">{dateLabel}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {dayBookings.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {dayBookings.slice(0, 4).map((booking) => (
                <div
                  key={booking.id}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStatusColor(booking.status)}`}
                >
                  {formatTime(booking.scheduledTime)} {booking.contact?.name?.split(' ')[0] || '?'}
                </div>
              ))}
              {dayBookings.length > 4 && (
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                  +{dayBookings.length - 4} more
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main Calendar Component ──────────────────────────────────────────────────

export function BookingCalendar() {
  const queryClient = useQueryClient()
  const { setSelectedContact } = useAppStore()

  // ── State ───────────────────────────────────────────────────────────────
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // ── Fetch Bookings for Current Month ────────────────────────────────────
  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)

  const fromStr = toDateKey(monthStart)
  const toStr = toDateKey(monthEnd)

  const bookingsQuery = useQuery<{ data: Booking[]; nextCursor: string | null; total: number }>({
    queryKey: ['bookings-calendar', fromStr, toStr],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200', from: fromStr, to: toStr })
      return fetch(`/api/bookings?${params}`).then((r) => r.json())
    },
  })

  // Fetch selected day's bookings with full detail
  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null
  const selectedDayBookings = useMemo(() => {
    if (!selectedDateKey) return []
    return (bookingsQuery.data?.data ?? []).filter(
      (b) => b.scheduledDate === selectedDateKey
    )
  }, [bookingsQuery.data?.data, selectedDateKey])

  // ── Group Bookings by Date ─────────────────────────────────────────────
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, Booking[]> = {}
    for (const booking of bookingsQuery.data?.data ?? []) {
      const key = booking.scheduledDate
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(booking)
    }
    return grouped
  }, [bookingsQuery.data?.data])

  // ── Calendar Grid Data ─────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

    // Previous month days to fill the first week
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth)

    const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []

    // Fill leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: prevDaysInMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      })
    }

    // Fill trailing days to complete the last row
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          day: d,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false,
        })
      }
    }

    return cells
  }, [currentYear, currentMonth])

  // ── Handlers ──────────────────────────────────────────────────────────
  function goToToday() {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function handleDayClick(day: number, month: number, year: number) {
    const date = new Date(year, month, day)
    setSelectedDate(date)
    setSheetOpen(true)
  }

  function handleMobileDayClick(day: number) {
    handleDayClick(day, currentMonth, currentYear)
  }

  function handleCloseSheet(open: boolean) {
    setSheetOpen(open)
    if (!open) setSelectedDate(null)
  }

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-bookings'] })
    },
  })

  function handleUpdateStatus(id: string, status: string) {
    updateBookingMutation.mutate({ id, data: { status } })
  }

  function handleNavigateToContact(contactId: string) {
    setSelectedContact(contactId)
    setSheetOpen(false)
  }

  // ── Stats for header ──────────────────────────────────────────────────
  const totalMonthBookings = bookingsQuery.data?.data?.length ?? 0
  const uniqueBookedDays = Object.keys(bookingsByDate).length

  // ── Render ────────────────────────────────────────────────────────────
  if (bookingsQuery.isLoading) {
    return <CalendarSkeleton />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <p className="text-xs text-muted-foreground">
                {totalMonthBookings} booking{totalMonthBookings !== 1 ? 's' : ''} across {uniqueBookedDays} day{uniqueBookedDays !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={goToNextMonth}>
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Calendar Grid */}
          <div className="hidden md:block">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px mb-px">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/50 rounded-t-md"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((cell, idx) => {
                const key = toDateKey(new Date(cell.year, cell.month, cell.day))
                const dayBookings = bookingsByDate[key] || []
                const isSelected = selectedDate
                  ? isSameDay(selectedDate, new Date(cell.year, cell.month, cell.day))
                  : false

                return (
                  <DayCell
                    key={`${cell.year}-${cell.month}-${cell.day}`}
                    day={cell.day}
                    month={cell.month}
                    year={cell.year}
                    bookings={dayBookings}
                    isCurrentMonth={cell.isCurrentMonth}
                    isSelected={isSelected}
                    onClick={() => handleDayClick(cell.day, cell.month, cell.year)}
                  />
                )
              })}
            </div>
          </div>

          {/* Mobile: List view by date */}
          <div className="md:hidden">
            <MobileDateList
              year={currentYear}
              month={currentMonth}
              bookingsByDate={bookingsByDate}
              isLoading={bookingsQuery.isLoading}
              onDayClick={handleMobileDayClick}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {[
              { status: 'scheduled', label: 'Scheduled' },
              { status: 'confirmed', label: 'Confirmed' },
              { status: 'completed', label: 'Completed' },
              { status: 'cancelled', label: 'Cancelled' },
              { status: 'no_show', label: 'No Show' },
            ].map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor(status)}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Bookings for {selectedDate?.toLocaleDateString()}</SheetTitle>
            <SheetDescription>View and manage bookings for the selected day</SheetDescription>
          </SheetHeader>
          <DayDetailContent
            date={selectedDate || new Date()}
            bookings={selectedDayBookings}
            isLoading={bookingsQuery.isLoading}
            onUpdateStatus={handleUpdateStatus}
            onNavigateToContact={handleNavigateToContact}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
