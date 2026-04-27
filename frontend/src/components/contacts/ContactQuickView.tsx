'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Phone,
  Mail,
  Globe,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  User,
  ChevronRight,
} from 'lucide-react'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'

// ── Types ────────────────────────────────────────────────────────────────────

interface ContactMemory {
  id: string
  contactId: string
  key: string
  value: string
  updatedAt: string
}

interface ContactDetail {
  id: string
  orgId: string
  phone: string
  name: string | null
  email: string | null
  pushName: string | null
  leadScore: number
  leadStatus: string
  language: string
  intent: string | null
  areaInterest: string | null
  bedrooms: string | null
  budget: string | null
  timeline: string | null
  notes: string | null
  assignedTo: string | null
  handledBy: string | null
  lastMessageAt: string | null
  createdAt: string
  memory: ContactMemory[]
  conversationCount: number
}

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

function getLeadScoreBadgeColor(score: number): string {
  if (score >= 81) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (score >= 61) return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
  if (score >= 41) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  if (score >= 21) return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
  return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
}

function getLeadStatusColor(status: string): string {
  switch (status) {
    case 'hot': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    case 'warm': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'cold': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    case 'converted': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
    case 'lost': return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
}

function getLeadStatusLabel(status: string): string {
  switch (status) {
    case 'hot': return 'Hot'
    case 'warm': return 'Warm'
    case 'cold': return 'Cold'
    case 'converted': return 'Converted'
    case 'lost': return 'Lost'
    case 'new': return 'New'
    default: return status
  }
}

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

// ── Loading Skeleton ────────────────────────────────────────────────────────

function QuickViewSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-1.5 mt-1">
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Separator />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  )
}

// ── Error State ─────────────────────────────────────────────────────────────

function QuickViewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-4 text-center gap-2">
      <div className="rounded-full bg-red-100 dark:bg-red-950 p-2.5">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-xs text-muted-foreground">Failed to load contact</p>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onRetry}>
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ContactQuickViewProps {
  contactId: string
  children: React.ReactNode
}

export function ContactQuickView({ contactId, children }: ContactQuickViewProps) {
  const { setCurrentPage, setSelectedContact, setSelectedConversation } = useAppStore()

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<{ data: ContactDetail }>({
    queryKey: ['contact-quick', contactId],
    queryFn: () => fetch(`/api/contacts/${contactId}`).then((r) => r.json()),
    staleTime: 30_000,
    enabled: !!contactId,
  })

  const contact = data?.data ?? null

  const displayName = contact
    ? (contact.pushName || contact.name || formatPhone(contact.phone))
    : ''

  const lastMessagePreview = (() => {
    if (!contact) return null
    const lastMsg = contact.memory?.find((m) => m.key === 'last_message')
    if (lastMsg) return lastMsg.value
    return null
  })()

  const handleViewProfile = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (contactId) {
      setSelectedContact(contactId)
      setCurrentPage('contacts')
    }
  }

  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (contactId) {
      setSelectedContact(contactId)
      setSelectedConversation(null)
      setCurrentPage('inbox')
    }
  }

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-[300px] p-0 glass-card shadow-card-md animate-scale-in"
      >
        <div className="p-4">
          {isLoading || isRefetching ? (
            <QuickViewSkeleton />
          ) : isError ? (
            <QuickViewError onRetry={() => refetch()} />
          ) : contact ? (
            <div className="space-y-3">
              {/* Header: Avatar + Name + Badges */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
                  <AvatarFallback className={`${getAvatarColor(contact.id)} text-base font-bold`}>
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {contact.name || displayName}
                  </p>
                  {contact.pushName && contact.name && contact.pushName !== contact.name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      aka {contact.pushName}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${getLeadScoreBadgeColor(contact.leadScore)}`}
                    >
                      Score: {contact.leadScore}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] capitalize h-5 ${getLeadStatusColor(contact.leadStatus)}`}
                    >
                      {getLeadStatusLabel(contact.leadStatus)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="font-mono">{formatPhone(contact.phone)}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <Badge variant="outline" className="text-[10px] h-5 font-medium">
                    {contact.language === 'ar' ? 'AR' : 'EN'}
                  </Badge>
                </div>
              </div>

              {/* Last Message Preview */}
              {lastMessagePreview && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 text-emerald-500" />
                      <span className="font-medium">Last message</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-[18px]">
                      &ldquo;{lastMessagePreview}&rdquo;
                    </p>
                  </div>
                </>
              )}

              {/* Conversation count & last active */}
              {(contact.conversationCount > 0 || contact.lastMessageAt) && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    {contact.conversationCount > 0 && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {contact.conversationCount} conversation{contact.conversationCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {contact.lastMessageAt && (
                      <span>Last active {formatTimeAgo(contact.lastMessageAt)}</span>
                    )}
                  </div>
                </>
              )}

              {/* Quick Actions */}
              <Separator />
              <div className="flex gap-2 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                  onClick={handleViewProfile}
                >
                  <User className="h-3.5 w-3.5" />
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                  onClick={handleSendMessage}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Send Message
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
