'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, ExternalLink, MessageSquare, PhoneCall, SendHorizontal, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { PropertyMatchPanel } from '@/components/inbox/PropertyMatchPanel'

interface ContactDetail {
  id: string
  name: string | null
  phone: string
  email: string | null
  pushName?: string | null
  leadScore: number
  leadStatus: string
  language: 'en' | 'ar'
  intent?: string | null
  areaInterest?: string | null
  budget?: string | null
  bedrooms?: string | null
  timeline?: string | null
  assignedTo?: string | null
  handledBy?: 'ai' | 'human'
  createdAt?: string
  conversationCount?: number
}

interface TimelineEvent {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
}

interface ConversationDetail {
  id: string
  handledBy: 'ai' | 'human'
  assignedTo?: string | null
  createdAt: string
  messages: Array<{ id: string }>
}

export function ContactSidebar({
  conversationId,
  contactId,
}: {
  conversationId: string | null
  contactId: string | null
}) {
  const queryClient = useQueryClient()

  const contactQuery = useQuery<ContactDetail | null>({
    queryKey: ['contact-sidebar', contactId],
    queryFn: async () => {
      if (!contactId) return null
      const response = await fetch(`/api/contacts/${contactId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load contact')
      const payload = (await response.json()) as { data: ContactDetail }
      return payload.data
    },
    enabled: Boolean(contactId),
  })

  const timelineQuery = useQuery<TimelineEvent[]>({
    queryKey: ['contact-timeline', contactId],
    queryFn: async () => {
      if (!contactId) return []
      const response = await fetch(`/api/contacts/${contactId}/timeline`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load timeline')
      const payload = (await response.json()) as { data: TimelineEvent[] }
      return payload.data ?? []
    },
    enabled: Boolean(contactId),
  })

  const conversationQuery = useQuery<ConversationDetail | null>({
    queryKey: ['conversation-sidebar', conversationId],
    queryFn: async () => {
      if (!conversationId) return null
      const response = await fetch(`/api/conversations/${conversationId}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load conversation')
      const payload = (await response.json()) as { data: ConversationDetail }
      return payload.data
    },
    enabled: Boolean(conversationId),
  })

  const nudgeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/nudges/send-now', {
        method: 'POST',        credentials: 'include',        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, conversationId }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to send nudge' }))
        throw new Error(payload.error || 'Failed to send nudge')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Nudge sent')
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contactId] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!contactId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10 opacity-20" />
        <p className="text-xs font-medium">Select a conversation</p>
        <p className="mt-1 text-[10px] opacity-60">to view contact info &amp; matched properties</p>
      </div>
    )
  }

  const contact = contactQuery.data
  const conversation = conversationQuery.data

  return (
    <ScrollArea className="h-full bg-card">
      <div className="space-y-4 p-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{contact?.name || contact?.phone || 'Unknown contact'}</p>
              <p className="text-[11px] text-muted-foreground">{contact?.phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-muted p-2">
              <p className="text-muted-foreground">Language</p>
              <p className="mt-1 text-foreground">{contact?.language === 'ar' ? 'Arabic' : 'English'}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-muted-foreground">Lead Score</p>
              <p className="mt-1 text-foreground">{contact?.leadScore ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-muted-foreground">Intent</p>
              <p className="mt-1 text-foreground">{contact?.intent || '-'}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-muted-foreground">Status</p>
              <p className="mt-1 text-foreground">{contact?.leadStatus || '-'}</p>
            </div>
          </div>

          {contact?.email ? (
            <div className="mt-3 rounded-lg bg-muted p-2 text-[11px] text-muted-foreground">{contact.email}</div>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation Info</p>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Handled by</span>
              <span className="text-foreground">{conversation?.handledBy === 'human' ? 'Human' : 'Aya AI'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Messages</span>
              <span className="text-foreground">{conversation?.messages.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned</span>
              <span className="text-foreground">{conversation?.assignedTo || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {conversation?.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <PropertyMatchPanel contactId={contactId} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nudge Activity</p>
          <div className="space-y-2">
            {(timelineQuery.data ?? []).filter((event) => event.type === 'nudge').slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-lg bg-muted p-2 text-[11px]">
                <p className="text-foreground">{event.title}</p>
                <p className="mt-1 text-muted-foreground">{event.description}</p>
                <p className="mt-1 text-muted-foreground/60">{new Date(event.timestamp).toLocaleString()}</p>
              </div>
            ))}
            {timelineQuery.data && timelineQuery.data.filter((event) => event.type === 'nudge').length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No nudge activity yet</p>
            ) : null}
          </div>
        </section>

        <div className="space-y-2">
          <Button className="h-9 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Calendar className="h-3.5 w-3.5" />
            Schedule Booking
          </Button>
          <Button
            variant="outline"
            className="h-9 w-full gap-2 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => nudgeMutation.mutate()}
            disabled={nudgeMutation.isPending}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            {nudgeMutation.isPending ? 'Sending...' : 'Send Nudge'}
          </Button>
          <Button
            variant="ghost"
            className="h-9 w-full gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => toast.info('Open full contact profile from the contacts page')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Full Profile
          </Button>
          <Button
            variant="ghost"
            className="h-9 w-full gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => contact?.phone && window.navigator.clipboard.writeText(contact.phone)}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Copy Phone
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
