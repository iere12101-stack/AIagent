'use client'

import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore, type AppPage } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock,
  Eye,
  MessageSquare,
  Settings,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NotificationCategory =
  | 'leads'
  | 'bookings'
  | 'system'
  | 'conversations'
  | 'alerts'
  | 'analytics'

type NotificationFilter =
  | 'all'
  | 'unread'
  | 'leads'
  | 'bookings'
  | 'system'
  | 'conversations'
  | 'alerts'
  | 'analytics'

interface CategoryConfig {
  icon: LucideIcon
  label: string
  borderColor: string
  iconBg: string
  iconColor: string
  badgeVariant: 'blue' | 'purple' | 'amber' | 'emerald' | 'red' | 'cyan'
}

interface NotificationMetadata {
  page?: AppPage
  contactId?: string
  conversationId?: string
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  channel: string
  status: string
  metadata?: NotificationMetadata | null
  createdAt: string
  readAt: string | null
}

interface NotificationsResponse {
  data: NotificationItem[]
  nextCursor: string | null
  total: number
  unreadCount: number
}

const CATEGORIES: Record<NotificationCategory, CategoryConfig> = {
  leads: {
    icon: UserPlus,
    label: 'Leads',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeVariant: 'blue',
  },
  bookings: {
    icon: CalendarDays,
    label: 'Bookings',
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeVariant: 'purple',
  },
  system: {
    icon: Settings,
    label: 'System',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeVariant: 'amber',
  },
  conversations: {
    icon: MessageSquare,
    label: 'Conversations',
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeVariant: 'emerald',
  },
  alerts: {
    icon: AlertTriangle,
    label: 'Alerts',
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeVariant: 'red',
  },
  analytics: {
    icon: BarChart3,
    label: 'Analytics',
    borderColor: 'border-l-cyan-500',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    badgeVariant: 'cyan',
  },
}

const BADGE_CLASSES: Record<CategoryConfig['badgeVariant'], string> = {
  blue: 'badge-blue',
  purple: 'badge-purple',
  amber: 'badge-amber',
  emerald: 'badge-emerald',
  red: 'badge-red',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700/40',
}

const FILTER_TABS: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'leads', label: 'Leads' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'conversations', label: 'Chats' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'system', label: 'System' },
]

function formatTimeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMinutes = Math.max(0, Math.floor((now - then) / 60000))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function resolveCategory(type: string): NotificationCategory {
  switch (type) {
    case 'lead':
      return 'leads'
    case 'booking':
      return 'bookings'
    case 'handoff':
      return 'conversations'
    case 'sentiment':
    case 'nudge':
      return 'alerts'
    case 'analytics':
      return 'analytics'
    default:
      return 'system'
  }
}

function resolvePage(item: NotificationItem): AppPage {
  if (item.metadata?.page) {
    return item.metadata.page
  }

  switch (item.type) {
    case 'lead':
      return 'contacts'
    case 'booking':
      return 'bookings'
    case 'handoff':
    case 'sentiment':
      return 'inbox'
    case 'nudge':
      return 'nudges'
    case 'analytics':
      return 'analytics'
    default:
      return 'devices'
  }
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications?limit=50')
  if (!response.ok) {
    throw new Error('Failed to load notifications')
  }

  return response.json()
}

export function useNotificationState() {
  const queryClient = useQueryClient()
  const query = useQuery<NotificationsResponse>({
    queryKey: ['notifications-feed'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] })
    },
  })

  const markSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to update notification')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] })
    },
  })

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    isMarkingAll: markAllMutation.isPending,
    refetch: query.refetch,
    markAllRead: () => markAllMutation.mutate(),
    markAsRead: (id: string) => markSingleMutation.mutate(id),
  }
}

interface NotificationFeedProps {
  onViewAll?: () => void
  compact?: boolean
}

export function NotificationFeed({ onViewAll, compact = false }: NotificationFeedProps) {
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const setSelectedContact = useAppStore((state) => state.setSelectedContact)
  const setSelectedConversation = useAppStore((state) => state.setSelectedConversation)
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    isError,
    isMarkingAll,
    markAllRead,
    markAsRead,
    refetch,
  } = useNotificationState()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const category = resolveCategory(notification.type)
      if (activeFilter === 'all') return true
      if (activeFilter === 'unread') return notification.readAt === null
      return category === activeFilter
    })
  }, [activeFilter, notifications])

  const handleClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.readAt) {
        markAsRead(notification.id)
      }

      if (notification.metadata?.contactId) {
        setSelectedContact(notification.metadata.contactId)
      }

      if (notification.metadata?.conversationId) {
        setSelectedConversation(notification.metadata.conversationId)
      }

      setCurrentPage(resolvePage(notification))
    },
    [markAsRead, setCurrentPage, setSelectedContact, setSelectedConversation],
  )

  const handleMarkReadOnly = useCallback(
    (event: MouseEvent<HTMLDivElement>, id: string) => {
      event.stopPropagation()
      markAsRead(id)
    },
    [markAsRead],
  )

  const totalForCategory = useCallback(
    (filter: NotificationFilter) => {
      if (filter === 'all') return total
      if (filter === 'unread') return unreadCount
      return notifications.filter((notification) => resolveCategory(notification.type) === filter).length
    },
    [notifications, total, unreadCount],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hidden pb-1">
          {FILTER_TABS.map((tab) => {
            const count = totalForCategory(tab.value)
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                  activeFilter === tab.value
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold ${
                      activeFilter === tab.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator className="opacity-50" />

      <ScrollArea
        className="flex-1"
        style={{ height: compact ? 'calc(100vh - 14rem)' : undefined }}
      >
        {isLoading ? (
          <div className="space-y-2 px-3 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-5 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Notifications could not be loaded</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-4">
              The notification center is live now, but this request failed. Try refreshing the feed.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="stagger-children px-3 py-2 flex flex-col gap-0.5">
            {filteredNotifications.map((notification) => {
              const category = resolveCategory(notification.type)
              const categoryConfig = CATEGORIES[category]
              const IconComponent = categoryConfig.icon
              const isUnread = notification.readAt === null

              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleClick(notification)
                    }
                  }}
                  className={`group flex items-start gap-3 p-3 rounded-lg border-l-[3px] ${categoryConfig.borderColor} transition-all duration-150 cursor-pointer ${
                    isUnread
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20'
                      : 'hover:bg-muted/60'
                  }`}
                >
                  <div
                    className="pt-0.5 shrink-0"
                    onClick={(event) => handleMarkReadOnly(event, notification.id)}
                  >
                    <Checkbox
                      checked={!isUnread}
                      className={`h-4 w-4 rounded transition-all duration-150 ${
                        isUnread
                          ? 'opacity-0 group-hover:opacity-100 border-muted-foreground/40'
                          : 'opacity-40'
                      }`}
                      onCheckedChange={() => markAsRead(notification.id)}
                    />
                  </div>

                  <div
                    className={`mt-0.5 rounded-full p-2 shrink-0 transition-opacity ${categoryConfig.iconBg} ${
                      isUnread ? '' : 'opacity-50'
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${categoryConfig.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-sm leading-snug truncate ${
                          isUnread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-muted-foreground'
                        }`}
                      >
                        {notification.title}
                      </span>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 font-medium ${BADGE_CLASSES[categoryConfig.badgeVariant]}`}
                      >
                        {categoryConfig.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="animate-float mb-4">
              <div className="rounded-full bg-muted p-5">
                {activeFilter === 'unread' ? (
                  <CheckCheck className="h-8 w-8 text-emerald-500" />
                ) : (
                  <Bell className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {activeFilter === 'unread'
                ? 'All caught up'
                : activeFilter === 'all'
                  ? 'No notifications yet'
                  : `No ${CATEGORIES[activeFilter as NotificationCategory]?.label.toLowerCase() ?? ''} notifications`}
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[240px]">
              {activeFilter === 'unread'
                ? 'New in-app alerts will appear here as soon as they are created.'
                : 'Alerts from handoffs, bookings, leads, and system events will show up here.'}
            </p>
            {activeFilter !== 'all' && activeFilter !== 'unread' && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => setActiveFilter('all')}
              >
                View all notifications
              </Button>
            )}
          </div>
        )}
      </ScrollArea>

      <Separator className="opacity-50" />
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">
          {unreadCount > 0
            ? `${unreadCount} unread of ${total}`
            : `${total} notification${total !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={markAllRead}
              disabled={isMarkingAll}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {isMarkingAll ? 'Updating...' : 'Mark all read'}
            </Button>
          )}
          {onViewAll && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onViewAll}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View all
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
