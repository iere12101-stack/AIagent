'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Clock,
  Send,
  XCircle,
  AlertTriangle,
  TrendingUp,
  X,
  Eye,
  RefreshCw,
  Ban,
  RotateCw,
  Phone,
  User,
  CalendarDays,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAppStore } from '@/lib/store'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
  if (digits.length === 10) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  return phone
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getNudgeTypeBadge(type: string): { color: string; label: string } {
  switch (type) {
    case '24h_follow_up': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', label: '24h Follow-up' }
    case '72h_follow_up': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', label: '72h Follow-up' }
    case 'viewing_reminder': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', label: 'Viewing Reminder' }
    case 'price_drop': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Price Drop' }
    default: return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: type }
  }
}

function getStatusBadge(status: string): { color: string; label: string } {
  switch (status) {
    case 'pending': return { color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', label: 'Pending' }
    case 'sent': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', label: 'Sent' }
    case 'cancelled': return { color: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: 'Cancelled' }
    case 'failed': return { color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800', label: 'Failed' }
    default: return { color: 'bg-gray-100 text-gray-600', label: status }
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Nudge {
  id: string
  orgId: string
  contactId: string
  conversationId: string
  nudgeType: string
  scheduledAt: string
  sentAt: string | null
  cancelledAt: string | null
  status: string
  messageSent: string | null
  createdAt: string
  contact?: { name: string | null; phone: string } | null
  contacts?: { id?: string | null; name: string | null; phone: string } | null
}

interface AnalyticsNudgeData {
  total: number
  pending: number
  sent: number
  cancelled: number
  failed: number
  conversionRate: number
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-7 w-14" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded" />
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function NudgesPage() {
  const { setSelectedContact } = useAppStore()
  const queryClient = useQueryClient()

  // ── Filter State ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cancelDialog, setCancelDialog] = useState<Nudge | null>(null)

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = useCallback(() => {
    setStatusFilter('all')
    setTypeFilter('all')
    setCursor(null)
  }, [])

  // ── Queries ───────────────────────────────────────────────────────────
  const analyticsQuery = useQuery<{ data: AnalyticsNudgeData }>({
    queryKey: ['analytics-nudges'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 60000,
  })

  const nudgesQuery = useQuery<{ data: Nudge[]; nextCursor: string | null; total: number }>({
    queryKey: ['nudges', statusFilter, typeFilter, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('nudgeType', typeFilter)
      if (cursor) params.set('cursor', cursor)
      return fetch(`/api/nudges?${params}`).then((r) => r.json())
    },
  })

  const nudges = nudgesQuery.data?.data ?? []
  const nextCursor = nudgesQuery.data?.nextCursor ?? null
  const total = nudgesQuery.data?.total ?? 0

  const nudgeStats = analyticsQuery.data?.data

  // ── Mutations ─────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetch(`/api/nudges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelledAt: new Date().toISOString() }),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nudges'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-nudges'] })
      setCancelDialog(null)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCancelNudge = useCallback((nudge: Nudge) => {
    setCancelDialog(nudge)
  }, [])

  const confirmCancel = useCallback(() => {
    if (cancelDialog) cancelMutation.mutate(cancelDialog.id)
  }, [cancelDialog, cancelMutation])

  const handleViewContact = useCallback((nudge: Nudge) => {
    setSelectedContact(nudge.contactId)
  }, [setSelectedContact])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-600" />
            Nudge Engine
          </h1>
          <p className="text-subtitle">Proactive re-engagement campaigns</p>
        </div>
        <Button variant="outline" size="sm" className="press-scale" onClick={() => { queryClient.invalidateQueries({ queryKey: ['nudges'] }); queryClient.invalidateQueries({ queryKey: ['analytics-nudges'] }) }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {analyticsQuery.isLoading ? (
        <SummarySkeleton />
      ) : nudgeStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-2xl font-bold">{nudgeStats.pending}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                  <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-2xl font-bold">{nudgeStats.sent}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
                  <XCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-2xl font-bold">{nudgeStats.cancelled}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Cancelled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-red-100 dark:bg-red-950 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-2xl font-bold">{nudgeStats.failed}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Failed</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-2xl font-bold">{nudgeStats.conversionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCursor(null) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCursor(null) }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Nudge Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="24h_follow_up">24h Follow-up</SelectItem>
                <SelectItem value="72h_follow_up">72h Follow-up</SelectItem>
                <SelectItem value="viewing_reminder">Viewing Reminder</SelectItem>
                <SelectItem value="price_drop">Price Drop</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nudge Cards Grid */}
      {nudgesQuery.isLoading && cursor === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : nudges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon rounded-full bg-muted p-4 mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No nudges found</h3>
          <p className="empty-state-text text-sm text-muted-foreground max-w-[260px] mb-4">
            {hasFilters ? 'Try adjusting your filters to find nudges.' : 'Nudge campaigns will appear here when scheduled.'}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {nudges.map((nudge) => {
              const typeBadge = getNudgeTypeBadge(nudge.nudgeType)
              const statusBadge = getStatusBadge(nudge.status)
              const contact = nudge.contact ?? nudge.contacts ?? null
              const contactPhone = contact?.phone ?? 'Unknown'
              const displayName = contact?.name || formatPhone(contactPhone)

              return (
                <Card key={nudge.id} className="group card-hover">
                  <CardContent className="p-4 space-y-3">
                    {/* Contact Header */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={`${getAvatarColor(nudge.contactId)} text-xs font-semibold`}>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{displayName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {formatPhone(contactPhone)}
                        </div>
                      </div>
                    </div>

                    {/* Type + Status Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`tag-pill inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${typeBadge.color}`}>
                        {typeBadge.label}
                      </span>
                      <Badge variant="outline" className={`tag-pill text-[11px] ${statusBadge.color}`}>
                        {statusBadge.label}
                      </Badge>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        <span>Scheduled: {formatDateTime(nudge.scheduledAt)}</span>
                      </div>
                      {nudge.sentAt && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Send className="h-3 w-3" />
                          <span>Sent: {formatDateTime(nudge.sentAt)}</span>
                        </div>
                      )}
                      {nudge.cancelledAt && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <XCircle className="h-3 w-3" />
                          <span>Cancelled: {formatDateTime(nudge.cancelledAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Message Preview */}
                    {nudge.messageSent && (
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-muted-foreground">Message Preview</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {nudge.messageSent}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs press-scale"
                        onClick={() => handleViewContact(nudge)}
                      >
                        <User className="h-3.5 w-3.5 mr-1" />
                        Contact
                      </Button>
                      {nudge.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 press-scale"
                          onClick={() => handleCancelNudge(nudge)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {nudge.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 press-scale"
                        >
                          <RotateCw className="h-3.5 w-3.5 mr-1" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {nudges.length} of {total}
            </span>
            {nextCursor ? (
              <Button variant="outline" size="sm" onClick={() => setCursor(nextCursor)} disabled={nudgesQuery.isLoading}>
                {nudgesQuery.isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : 'Load More'}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">End of results</span>
            )}
          </div>
        </>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={(open) => { if (!open) setCancelDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Nudge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this {cancelDialog ? getNudgeTypeBadge(cancelDialog.nudgeType).label : ''} nudge
              for {cancelDialog?.contact?.name || cancelDialog?.contacts?.name || cancelDialog?.contact?.phone || cancelDialog?.contacts?.phone || 'this contact'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Nudge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
