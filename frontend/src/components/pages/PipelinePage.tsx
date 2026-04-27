'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Users,
  Flame,
  TrendingUp,
  Clock,
  MapPin,
  Target,
  Phone,
  ArrowRight,
  Sparkles,
  GripVertical,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useCallback, useRef, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = 'new' | 'cold' | 'warm' | 'hot' | 'converted' | 'lost'

interface Contact {
  id: string
  name: string
  phone: string
  pushName: string | null
  leadScore: number
  leadStatus: LeadStatus
  intent: 'buy' | 'rent' | 'invest' | 'browse' | null
  areaInterest: string | null
  language: 'en' | 'ar' | null
  email: string | null
  createdAt: string
  updatedAt: string
  conversationCount?: number
  lastMessageAt?: string
}

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
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getIntentBadgeColor(intent: string | null): string {
  switch (intent) {
    case 'buy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    case 'rent': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    case 'invest': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
    case 'browse': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default: return ''
  }
}

function getLeadScoreColor(score: number): string {
  if (score >= 81) return 'bg-emerald-500'
  if (score >= 61) return 'bg-green-500'
  if (score >= 41) return 'bg-amber-500'
  if (score >= 21) return 'bg-orange-500'
  return 'bg-red-500'
}

// ── Column Config ────────────────────────────────────────────────────────────

interface ColumnConfig {
  key: LeadStatus
  label: string
  gradientFrom: string
  gradientTo: string
  dotColor: string
  iconBg: string
  iconColor: string
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'new',
    label: 'New',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-400',
    dotColor: 'bg-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'cold',
    label: 'Cold',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-300',
    dotColor: 'bg-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400',
  },
  {
    key: 'warm',
    label: 'Warm',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-400',
    dotColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'hot',
    label: 'Hot',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-500',
    dotColor: 'bg-orange-500',
    iconBg: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    key: 'converted',
    label: 'Converted',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-400',
    dotColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'lost',
    label: 'Lost',
    gradientFrom: 'from-red-400',
    gradientTo: 'to-red-300',
    dotColor: 'bg-red-300',
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-400 dark:text-red-300',
  },
]

// ── Mini Lead Score Circle ───────────────────────────────────────────────────

function MiniLeadScoreCircle({ score }: { score: number }) {
  const size = 28
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const strokeColor = score >= 81 ? 'stroke-emerald-500' : score >= 61 ? 'stroke-green-500' : score >= 41 ? 'stroke-amber-500' : score >= 21 ? 'stroke-orange-500' : 'stroke-red-500'

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={strokeColor}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">
        {score}
      </span>
    </div>
  )
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function SummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-3 w-24 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div key={col.key} className="min-w-[280px] w-[280px] shrink-0">
          <Skeleton className="h-10 w-full rounded-t-lg mb-0" />
          <div className="space-y-3 p-3 bg-muted/30 rounded-b-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2.5 mb-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 ml-auto" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onClick,
}: {
  contact: Contact
  onClick: () => void
}) {
  const displayName = contact.pushName || contact.name || contact.phone
  const lastActivity = contact.lastMessageAt || contact.updatedAt

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ contactId: contact.id, fromStatus: contact.leadStatus }))
      e.dataTransfer.effectAllowed = 'move'
      // Add dragging class after a small delay to allow the drag image to capture
      const target = e.currentTarget as HTMLElement
      requestAnimationFrame(() => {
        target.style.opacity = '0.4'
        target.style.transform = 'rotate(2deg) scale(0.95)'
      })
    },
    [contact.id, contact.leadStatus]
  )

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = ''
    target.style.transform = ''
  }, [])

  return (
    <button
      draggable="true"
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="w-full text-left p-3 rounded-lg border bg-card hover:-translate-y-[1px] hover:shadow-md dark:hover:shadow-black/20 transition-all duration-200 group cursor-grab active:cursor-grabbing"
    >
      {/* Top row: drag handle, avatar, name, score */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`${getAvatarColor(contact.id)} text-xs font-semibold`}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {contact.name || displayName}
          </p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="text-[11px] truncate">{contact.phone}</span>
          </div>
        </div>
        <MiniLeadScoreCircle score={contact.leadScore} />
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {contact.intent && (
          <span className={`tag-pill inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${getIntentBadgeColor(contact.intent)}`}>
            <Target className="h-2.5 w-2.5" />
            {contact.intent}
          </span>
        )}
        {contact.areaInterest && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate max-w-[100px]">{contact.areaInterest}</span>
          </span>
        )}
      </div>

      {/* Time since last activity */}
      <div className="flex items-center gap-1 mt-2 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="text-[10px]">{formatTimeAgo(lastActivity)}</span>
      </div>
    </button>
  )
}

// ── Empty Column ─────────────────────────────────────────────────────────────

function EmptyColumn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="rounded-full bg-muted/50 p-3 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground">No leads in</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

// ── Kanban Column (drop target) ─────────────────────────────────────────────

function KanbanColumn({
  col,
  colIndex,
  contacts,
  onCardClick,
  onDropContact,
}: {
  col: ColumnConfig
  colIndex: number
  contacts: Contact[]
  onCardClick: (contact: Contact) => void
  onDropContact: (contactId: string, fromStatus: LeadStatus, toStatus: LeadStatus) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragOverCounter = useRef(0)

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverCounter.current += 1
    if (!isDragOver) {
      setIsDragOver(true)
    }
  }, [isDragOver])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragOverCounter.current += 1
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    dragOverCounter.current -= 1
    if (dragOverCounter.current <= 0) {
      dragOverCounter.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      dragOverCounter.current = 0

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'))
        if (data.contactId && data.fromStatus) {
          onDropContact(data.contactId, data.fromStatus as LeadStatus, col.key)
        }
      } catch {
        // Ignore invalid drag data
      }
    },
    [col.key, onDropContact]
  )

  return (
    <div className="min-w-[280px] w-[280px] shrink-0 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-lg border border-b-0 bg-card relative overflow-hidden">
        {/* Gradient left border */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${col.gradientFrom} ${col.gradientTo}`} />

        <div className={`rounded-md p-1.5 ${col.iconBg}`}>
          <ArrowRight className={`h-3.5 w-3.5 ${col.iconColor}`} />
        </div>
        <span className="text-sm font-semibold flex-1">{col.label}</span>
        <Badge variant="secondary" className="h-5 min-w-[22px] text-[10px] font-bold px-1.5 justify-center">
          {contacts.length}
        </Badge>
      </div>

      {/* Column Body - Drop Target */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 rounded-b-lg border border-t-0 bg-muted/20 overflow-hidden transition-all duration-200 ${
          isDragOver
            ? 'border-emerald-400 border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]'
            : ''
        }`}
      >
        {/* Drop hint */}
        {isDragOver && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100/80 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Drop here to move to {col.label}
            </span>
          </div>
        )}
        <ScrollArea className="h-[calc(100vh-320px)] max-h-[600px]">
          <div className="p-3 space-y-3">
            {contacts.length === 0 ? (
              <EmptyColumn icon={Users} label={col.label} />
            ) : (
              contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={() => onCardClick(contact)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Pipeline arrow between columns (except last) */}
      {colIndex < COLUMNS.length - 1 && (
        <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 pointer-events-none" style={{ position: 'relative', right: '-12px', top: '0' }}>
          <div className="w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PipelinePage() {
  const { setCurrentPage, setSelectedContact } = useAppStore()
  const queryClient = useQueryClient()

  // ── Queries ─────────────────────────────────────────────────────────────
  const contactsQuery = useQuery<{ data: Contact[] }>({
    queryKey: ['contacts-pipeline'],
    queryFn: () => fetch('/api/contacts?limit=50').then((r) => r.json()),
    staleTime: 30000,
  })

  const analyticsQuery = useQuery<{
    data: {
      totalContacts: number
      hotLeads: number
      warmLeads: number
      convertedLeads: number
      newLeads?: number
      coldLeads?: number
      lostLeads?: number
      avgDaysToConvert?: number
      conversionRate?: number
    }
  }>({
    queryKey: ['analytics-pipeline'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 60000,
  })

  // ── Mutation: Update lead status ──────────────────────────────────────
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ contactId, leadStatus }: { contactId: string; leadStatus: LeadStatus }) => {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus }),
      })
      if (!res.ok) throw new Error('Failed to update lead status')
      return res.json()
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['contacts-pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  // Optimistic local state override for dragging
  const [optimisticMove, setOptimisticMove] = useState<{
    contactId: string
    fromStatus: LeadStatus
    toStatus: LeadStatus
  } | null>(null)

  const allContacts = contactsQuery.data?.data ?? []
  const analytics = analyticsQuery.data?.data ?? null

  // Apply optimistic move to the contacts list
  const processedContacts = allContacts.map((c) => {
    if (optimisticMove && c.id === optimisticMove.contactId) {
      return { ...c, leadStatus: optimisticMove.toStatus }
    }
    return c
  })

  // Group contacts by lead status
  const contactsByStatus: Record<LeadStatus, Contact[]> = {
    new: [],
    cold: [],
    warm: [],
    hot: [],
    converted: [],
    lost: [],
  }

  processedContacts.forEach((contact) => {
    const status = (contact.leadStatus || 'new') as LeadStatus
    if (contactsByStatus[status]) {
      contactsByStatus[status].push(contact)
    }
  })

  // Sort each column by lead score descending
  Object.keys(contactsByStatus).forEach((key) => {
    contactsByStatus[key as LeadStatus].sort((a, b) => b.leadScore - a.leadScore)
  })

  const totalInPipeline = processedContacts.filter((c) => !['converted', 'lost'].includes(c.leadStatus || 'new')).length
  const hotCount = contactsByStatus.hot.length
  const convertedCount = contactsByStatus.converted.length
  const conversionRate = analytics?.conversionRate
    ? `${analytics.conversionRate}%`
    : processedContacts.length > 0
      ? `${Math.round((convertedCount / processedContacts.length) * 100)}%`
      : '0%'
  const avgDaysToConvert = analytics?.avgDaysToConvert ?? '—'

  // ── Click handler ───────────────────────────────────────────────────────
  const handleCardClick = (contact: Contact) => {
    setSelectedContact(contact.id)
    setCurrentPage('contacts')
  }

  // ── Drop handler ───────────────────────────────────────────────────────
  const handleDropContact = useCallback(
    (contactId: string, fromStatus: LeadStatus, toStatus: LeadStatus) => {
      if (fromStatus === toStatus) return

      // Find the contact for the toast message
      const contact = allContacts.find((c) => c.id === contactId)
      const contactName = contact?.name || contact?.pushName || contact?.phone || 'Contact'
      const targetColumn = COLUMNS.find((c) => c.key === toStatus)?.label || toStatus

      // Optimistic UI: immediately move the card
      setOptimisticMove({ contactId, fromStatus, toStatus })

      updateLeadStatusMutation.mutate(
        { contactId, leadStatus: toStatus },
        {
          onSuccess: () => {
            setOptimisticMove(null)
            toast.success(`Moved ${contactName} to ${targetColumn}`, {
              description: 'Lead status updated successfully',
            })
          },
          onError: () => {
            // Revert optimistic update
            setOptimisticMove(null)
            toast.error('Failed to move contact', {
              description: 'The lead status could not be updated. Please try again.',
            })
          },
        }
      )
    },
    [allContacts, updateLeadStatusMutation]
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display">Lead Pipeline</h1>
          <p className="text-subtitle">
            Visualize your leads through each stage of the sales funnel
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 press-scale"
          onClick={() => {
            contactsQuery.refetch()
            analyticsQuery.refetch()
          }}
          disabled={contactsQuery.isLoading}
        >
          <Sparkles className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {analyticsQuery.isLoading && contactsQuery.isLoading ? (
        <SummaryStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2.5">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-2xl font-bold">{totalInPipeline}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Total Pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2.5">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-2xl font-bold">{conversionRate}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Conversion Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2.5">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-2xl font-bold">
                  {typeof avgDaysToConvert === 'number' ? `${avgDaysToConvert}d` : avgDaysToConvert}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Avg Days to Convert</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-orange-100 dark:bg-orange-950 p-2.5">
                  <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-2xl font-bold">{hotCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Hot Leads</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {contactsQuery.isLoading ? (
        <KanbanSkeleton />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col, colIndex) => (
            <KanbanColumn
              key={col.key}
              col={col}
              colIndex={colIndex}
              contacts={contactsByStatus[col.key]}
              onCardClick={handleCardClick}
              onDropContact={handleDropContact}
            />
          ))}
        </div>
      )}
    </div>
  )
}
