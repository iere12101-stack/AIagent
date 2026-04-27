'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarDays,
  Download,
  FileText,
  Filter,
  LogIn,
  MessageSquare,
  RefreshCw,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

type EventType = 'login' | 'property' | 'contact' | 'conversation' | 'booking' | 'settings' | 'system'
type ActionType = 'Created' | 'Updated' | 'Deleted' | 'Viewed' | 'Exported' | 'Login' | 'Sent'

interface ActivityEvent {
  id: string
  eventType: EventType
  action: ActionType
  description: string
  user: string
  userInitials: string
  target: string
  timestamp: string
}

async function fetchActivityLog(): Promise<{ data: ActivityEvent[] }> {
  const response = await fetch('/api/activity-log')
  if (!response.ok) {
    throw new Error('Failed to load activity log')
  }

  return response.json()
}

function getEventIcon(type: EventType) {
  const icons: Record<EventType, React.ElementType> = {
    property: Building2,
    contact: Users,
    booking: CalendarDays,
    conversation: MessageSquare,
    settings: Settings,
    login: LogIn,
    system: Server,
  }

  return icons[type]
}

function getEventIconBg(type: EventType): string {
  const map: Record<EventType, string> = {
    property: 'bg-emerald-100 text-emerald-600',
    contact: 'bg-blue-100 text-blue-600',
    booking: 'bg-purple-100 text-purple-600',
    conversation: 'bg-cyan-100 text-cyan-600',
    settings: 'bg-gray-100 text-gray-600',
    login: 'bg-amber-100 text-amber-600',
    system: 'bg-red-100 text-red-600',
  }

  return map[type]
}

function getActionBorderColor(action: ActionType): string {
  const map: Record<ActionType, string> = {
    Created: 'border-l-emerald-500',
    Updated: 'border-l-blue-500',
    Deleted: 'border-l-red-500',
    Viewed: 'border-l-gray-400',
    Exported: 'border-l-purple-500',
    Login: 'border-l-amber-500',
    Sent: 'border-l-cyan-500',
  }

  return map[action]
}

function getActionNodeColor(action: ActionType): string {
  const map: Record<ActionType, string> = {
    Created: 'bg-emerald-500',
    Updated: 'bg-blue-500',
    Deleted: 'bg-red-500',
    Viewed: 'bg-gray-400',
    Exported: 'bg-purple-500',
    Login: 'bg-amber-500',
    Sent: 'bg-cyan-500',
  }

  return map[action]
}

function getActionBadgeStyle(action: ActionType): string {
  const map: Record<ActionType, string> = {
    Created: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Updated: 'bg-blue-100 text-blue-700 border-blue-200',
    Deleted: 'bg-red-100 text-red-700 border-red-200',
    Viewed: 'bg-gray-100 text-gray-600 border-gray-200',
    Exported: 'bg-purple-100 text-purple-700 border-purple-200',
    Login: 'bg-amber-100 text-amber-700 border-amber-200',
    Sent: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  }

  return map[action]
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMinutes = Math.max(0, Math.floor((now - then) / 60000))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDateGroupHeader(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)

  if (date >= todayStart) return 'Today'
  if (date >= yesterdayStart && date < todayStart) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
        </div>
      </CardContent>
    </Card>
  )
}

function EventCardSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="w-0.5 flex-1 bg-muted mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <Card className="border-l-4">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [visibleCount, setVisibleCount] = useState(20)

  const activityQuery = useQuery({
    queryKey: ['activity-log'],
    queryFn: fetchActivityLog,
    staleTime: 30_000,
  })

  const allEvents = activityQuery.data?.data ?? []
  const isLoading = activityQuery.isLoading || activityQuery.isFetching

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !event.description.toLowerCase().includes(query)
          && !event.user.toLowerCase().includes(query)
          && !event.target.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      if (eventTypeFilter !== 'all' && event.eventType !== eventTypeFilter) {
        return false
      }

      if (userFilter !== 'all' && event.user !== userFilter) {
        return false
      }

      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime()
        if (new Date(event.timestamp).getTime() < fromTime) {
          return false
        }
      }

      if (dateTo) {
        const toTime = new Date(dateTo).getTime() + 86_400_000
        if (new Date(event.timestamp).getTime() > toTime) {
          return false
        }
      }

      return true
    })
  }, [allEvents, dateFrom, dateTo, eventTypeFilter, searchQuery, userFilter])

  const groupedEvents = useMemo(() => {
    const groups: Array<{ label: string; events: ActivityEvent[] }> = []
    let currentLabel = ''

    filteredEvents.forEach((event) => {
      const label = getDateGroupHeader(event.timestamp)
      if (label !== currentLabel) {
        groups.push({ label, events: [] })
        currentLabel = label
      }
      groups[groups.length - 1].events.push(event)
    })

    return groups
  }, [filteredEvents])

  const visibleGroups = useMemo(() => {
    let count = 0
    const result: Array<{ label: string; events: ActivityEvent[] }> = []

    for (const group of groupedEvents) {
      if (count >= visibleCount) break
      const remaining = visibleCount - count
      const events = group.events.slice(0, remaining)
      result.push({ label: group.label, events })
      count += events.length
    }

    return result
  }, [groupedEvents, visibleCount])

  const stats = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEvents = allEvents.filter((event) => new Date(event.timestamp) >= todayStart)
    const uniqueUsers = new Set(allEvents.map((event) => event.user))
    const alertEvents = allEvents.filter((event) => event.eventType === 'system')

    return {
      total: allEvents.length,
      today: todayEvents.length,
      actions: allEvents.filter((event) => event.action !== 'Login' && event.action !== 'Viewed').length,
      users: uniqueUsers.size,
      alerts: alertEvents.length,
    }
  }, [allEvents])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (eventTypeFilter !== 'all') count++
    if (userFilter !== 'all') count++
    if (dateFrom) count++
    if (dateTo) count++
    return count
  }, [dateFrom, dateTo, eventTypeFilter, searchQuery, userFilter])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setEventTypeFilter('all')
    setUserFilter('all')
    setDateFrom('')
    setDateTo('')
    setVisibleCount(20)
  }, [])

  const exportCSV = useCallback(() => {
    const rows = visibleGroups.flatMap((group) => group.events)
    const header = 'Timestamp,Event Type,Action,User,Target,Description'
    const body = rows
      .map((event) =>
        `"${new Date(event.timestamp).toISOString()}","${event.eventType}","${event.action}","${event.user}","${event.target}","${event.description.replace(/"/g, '""')}"`,
      )
      .join('\n')

    const csv = [header, body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `iere-activity-log-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [visibleGroups])

  const allUserNames = useMemo(() => {
    return Array.from(new Set(allEvents.map((event) => event.user))).sort()
  }, [allEvents])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-emerald-600" />
            Activity Log
          </h1>
          <p className="text-muted-foreground">Audit trail and system events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={allEvents.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVisibleCount(20)
              void activityQuery.refetch()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <ScrollText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Events</p>
                <p className="text-xl font-bold">{stats.today}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actions</p>
                <p className="text-xl font-bold">{stats.actions}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-xl font-bold">{stats.users}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">System Alerts</p>
                <p className="text-xl font-bold">{stats.alerts}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, users, targets..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="conversation">Conversation</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {allUserNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
                <Input
                  type="date"
                  className="w-full sm:w-[150px] h-9 text-sm"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
                <Input
                  type="date"
                  className="w-full sm:w-[150px] h-9 text-sm"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        {!isLoading && filteredEvents.length > 0 && (
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-emerald-200 z-0" />
        )}

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : activityQuery.isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Activity log unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] mb-4">
              The live audit feed could not be loaded right now. Try refreshing once the API is reachable.
            </p>
            <Button variant="outline" size="sm" onClick={() => void activityQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No events found</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] mb-4">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4 mt-2 relative z-10">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    {group.label}
                  </h2>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-0 relative z-10">
                  {group.events.map((event, index) => {
                    const Icon = getEventIcon(event.eventType)
                    const borderClass = getActionBorderColor(event.action)
                    const nodeColor = getActionNodeColor(event.action)
                    const iconBg = getEventIconBg(event.eventType)
                    const badgeStyle = getActionBadgeStyle(event.action)
                    const isLastInGroup = index === group.events.length - 1

                    return (
                      <div key={event.id} className="flex gap-3 group">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`h-9 w-9 rounded-full ${iconBg} flex items-center justify-center ring-2 ring-white shadow-sm`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {!isLastInGroup && (
                            <div className="relative w-0.5 flex-1 bg-emerald-200 mt-1">
                              <div className={`absolute left-1/2 -translate-x-1/2 top-3 h-2.5 w-2.5 rounded-full ${nodeColor} ring-2 ring-white`} />
                            </div>
                          )}
                        </div>

                        <Card className={`flex-1 mb-4 border-l-4 ${borderClass} group-hover:shadow-md transition-shadow`}>
                          <CardContent className="p-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600">
                                  {event.userInitials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-slate-700">{event.user}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatRelativeTime(event.timestamp)}
                              </span>
                            </div>

                            <p className="text-sm text-slate-800 leading-relaxed">{event.description}</p>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-[11px] ${badgeStyle}`}>
                                {event.action}
                              </Badge>
                              <Badge variant="secondary" className="text-[11px] gap-1">
                                <Shield className="h-3 w-3" />
                                {event.target}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {visibleCount < filteredEvents.length && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((current) => current + 20)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Load More
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {filteredEvents.length - visibleCount} remaining
                  </Badge>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
