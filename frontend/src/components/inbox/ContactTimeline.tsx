'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Bell,
  Bot,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

type TimelineEventType =
  | 'message_sent'
  | 'message_received'
  | 'lead_score'
  | 'booking'
  | 'nudge'
  | 'handoff'
  | 'contact_created'
  | 'ai_response'

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description: string
  timestamp: string
}

interface ContactTimelineProps {
  contactId: string | null
  contactName: string
}

interface TimelineVisual {
  icon: ReactNode
  color: string
  iconColor: string
  iconBg: string
}

async function fetchTimeline(contactId: string): Promise<{ data: TimelineEvent[] }> {
  const response = await fetch(`/api/contacts/${contactId}/timeline`)
  if (!response.ok) {
    throw new Error('Failed to load contact timeline')
  }

  return response.json()
}

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

function getTimelineVisual(type: TimelineEventType): TimelineVisual {
  switch (type) {
    case 'message_received':
      return {
        icon: <MessageSquare className="h-3 w-3" />,
        color: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-100 dark:bg-emerald-950',
      }
    case 'message_sent':
      return {
        icon: <MessageSquare className="h-3 w-3" />,
        color: 'bg-cyan-500',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        iconBg: 'bg-cyan-100 dark:bg-cyan-950',
      }
    case 'ai_response':
      return {
        icon: <Bot className="h-3 w-3" />,
        color: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-100 dark:bg-emerald-950',
      }
    case 'lead_score':
      return {
        icon: <TrendingUp className="h-3 w-3" />,
        color: 'bg-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-100 dark:bg-amber-950',
      }
    case 'booking':
      return {
        icon: <Calendar className="h-3 w-3" />,
        color: 'bg-blue-500',
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-950',
      }
    case 'nudge':
      return {
        icon: <Bell className="h-3 w-3" />,
        color: 'bg-rose-500',
        iconColor: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-100 dark:bg-rose-950',
      }
    case 'handoff':
      return {
        icon: <UserPlus className="h-3 w-3" />,
        color: 'bg-cyan-500',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        iconBg: 'bg-cyan-100 dark:bg-cyan-950',
      }
    case 'contact_created':
      return {
        icon: <UserPlus className="h-3 w-3" />,
        color: 'bg-gray-400',
        iconColor: 'text-gray-600 dark:text-gray-400',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
      }
    default:
      return {
        icon: <Building2 className="h-3 w-3" />,
        color: 'bg-purple-500',
        iconColor: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-100 dark:bg-purple-950',
      }
  }
}

function EmptyTimeline({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="rounded-full bg-muted p-2.5 mb-2.5">
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-1" />
          <div className="flex-1 rounded-lg bg-muted/40 px-2.5 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContactTimeline({ contactId, contactName }: ContactTimelineProps) {
  const [isOpen, setIsOpen] = useState(true)
  const timelineQuery = useQuery({
    queryKey: ['contact-timeline', contactId],
    queryFn: () => fetchTimeline(contactId ?? ''),
    enabled: Boolean(contactId),
    staleTime: 30_000,
  })

  const timelineEvents = useMemo(() => {
    return timelineQuery.data?.data ?? []
  }, [timelineQuery.data])

  if (!contactId) {
    return (
      <div className="border-t">
        <button
          onClick={() => setIsOpen((current) => !current)}
          className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Activity Timeline</span>
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-3 pt-1">
            <EmptyTimeline message="Select a contact to view timeline" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Activity className="h-3.5 w-3.5" />
        <span>Activity Timeline</span>
        <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
          {timelineEvents.length}
        </span>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-3 pt-1">
          <div className="max-h-64 overflow-y-auto scroll-smooth pr-1">
            {timelineQuery.isLoading ? (
              <TimelineSkeleton />
            ) : timelineQuery.isError ? (
              <EmptyTimeline message={`Timeline for ${contactName || 'this contact'} could not be loaded right now`} />
            ) : timelineEvents.length === 0 ? (
              <EmptyTimeline message={`No recorded activity yet for ${contactName || 'this contact'}`} />
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-emerald-200 dark:bg-emerald-900" />
                <div className="space-y-3 stagger-children">
                  {timelineEvents.map((event, index) => {
                    const visual = getTimelineVisual(event.type)
                    return (
                      <div
                        key={event.id}
                        className="relative flex gap-3"
                        style={{ paddingLeft: index % 2 === 0 ? '0px' : '6px' }}
                      >
                        <div className="relative z-10 mt-0.5 shrink-0">
                          <div className={`h-[16px] w-[16px] rounded-full ${visual.color} ring-[3px] ring-background flex items-center justify-center`}>
                            <div className="h-[6px] w-[6px] rounded-full bg-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pb-0.5">
                          <div className="flex items-start gap-2 rounded-lg bg-muted/40 dark:bg-muted/20 px-2.5 py-2">
                            <div className={`shrink-0 h-[22px] w-[22px] rounded-full ${visual.iconBg} flex items-center justify-center ${visual.iconColor}`}>
                              {visual.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
                                  {event.title}
                                </p>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatTimeAgo(event.timestamp)}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
