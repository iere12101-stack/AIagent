'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AlertTriangle, Bot, Copy, Forward, MessageSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConversationHeader } from '@/components/inbox/ConversationHeader'
import { MessageInput } from '@/components/inbox/MessageInput'
import { useInboxRealtime } from '@/hooks/useInboxRealtime'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  role: string
}

interface MessageRecord {
  id: string
  direction: 'inbound' | 'outbound'
  senderType: 'ai' | 'human' | 'contact' | 'system'
  senderName?: string | null
  content: string
  status?: string | null
  createdAt: string
}

interface ConversationDetail {
  id: string
  handledBy: 'ai' | 'human'
  assignedTo?: string | null
  leadScore: number
  detectedLang: 'en' | 'ar'
  unreadCount: number
  createdAt: string
  contact: {
    id: string
    name: string | null
    phone: string
    pushName?: string | null
  }
  messages: MessageRecord[]
}

function dayLabel(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDisplayName(contact: ConversationDetail['contact']): string {
  return contact.name || contact.pushName || contact.phone
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((entry) => entry[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(id: string): string {
  const palette = ['#25D453', '#0EA5E9', '#D4A017', '#8B5CF6', '#F97316', '#14B8A6']
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0
  }
  return palette[Math.abs(hash) % palette.length]
}

function getLeadTier(score: number): 'VIP' | 'HOT' | 'WARM' | 'COLD' {
  if (score >= 85) return 'VIP'
  if (score >= 65) return 'HOT'
  if (score >= 35) return 'WARM'
  return 'COLD'
}

function MessageItem({
  message,
  onCopy,
  onDelete,
  onForward,
}: {
  message: MessageRecord
  onCopy: (content: string) => void
  onDelete: (messageId: string) => void
  onForward: (messageId: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  if (message.senderType === 'system') {
    return (
      <div className="my-3 flex justify-center">
        <div className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[11px] text-orange-200">
          {message.content}
        </div>
      </div>
    )
  }

  const isOutbound = message.direction === 'outbound'

  return (
    <div
      className={cn('group relative mb-2 flex', isOutbound ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? (
        <div
          className={cn(
            'absolute top-0 z-10 flex items-center gap-1 rounded-lg border border-border bg-popover px-1.5 py-1 shadow-xl',
            isOutbound ? 'right-0 -top-8' : 'left-0 -top-8',
          )}
        >
          <button className="rounded p-1 text-white/40 hover:bg-white/[0.08] hover:text-white" onClick={() => onCopy(message.content)}>
            <Copy className="h-3.5 w-3.5" />
          </button>
          {['🏠', '📍', '✓'].map((emoji) => (
            <button key={emoji} className="rounded p-1 text-sm hover:bg-white/[0.08]">
              {emoji}
            </button>
          ))}
          <button className="rounded p-1 text-white/40 hover:bg-white/[0.08] hover:text-white" onClick={() => onForward(message.id)}>
            <Forward className="h-3.5 w-3.5" />
          </button>
          {isOutbound && message.senderType === 'ai' ? (
            <button className="rounded p-1 text-red-300 hover:bg-red-500/20" onClick={() => onDelete(message.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'relative max-w-[75%] rounded-2xl px-3.5 py-2.5',
          isOutbound ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-muted-foreground',
        )}
      >
        {message.senderType === 'ai' && isOutbound ? (
          <div className="mb-1 flex items-center gap-1">
            <Bot className="h-3 w-3 text-green-100/80" />
            <span className="text-[10px] text-green-100/80">Aya AI</span>
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          {isOutbound && message.status === 'failed' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-200">
              <AlertTriangle className="h-3 w-3" />
              Failed
            </span>
          ) : null}
          <span className="text-[10px] opacity-60">{format(new Date(message.createdAt), 'h:mm a')}</span>
          {isOutbound ? (
            <span className="text-[10px] opacity-60">
              {message.status === 'failed' ? '!' : message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function MessageThread({ conversationId }: { conversationId: string | null }) {
  const queryClient = useQueryClient()

  const conversationQuery = useQuery<ConversationDetail | null>({
    queryKey: ['conversation', conversationId],
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

  const teamQuery = useQuery<{ data: TeamMember[] }>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await fetch('/api/team', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load team members')
      return response.json()
    },
    staleTime: 60_000,
  })

  useInboxRealtime(conversationId)

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/v1/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to delete message')
    },
    onSuccess: () => {
      toast.success('Message deleted')
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateConversationMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!conversationId) return
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('Failed to update conversation')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const conversation = conversationQuery.data

  const groupedMessages = useMemo(() => {
    if (!conversation?.messages) return []
    let lastDay = ''
    return conversation.messages.flatMap((message) => {
      const label = dayLabel(message.createdAt)
      const items: Array<{ type: 'day' | 'message'; label?: string; message?: MessageRecord }> = []
      if (label !== lastDay) {
        lastDay = label
        items.push({ type: 'day', label })
      }
      items.push({ type: 'message', message })
      return items
    })
  }, [conversation?.messages])

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card px-4 text-center">
        <div className="mb-4 rounded-full bg-white/[0.04] p-6">
          <MessageSquare className="h-10 w-10 text-white/25" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-[#e8f0e8]">Select a conversation</h3>
        <p className="max-w-[260px] text-sm text-white/35">Choose a conversation from the list to view messages and respond.</p>
      </div>
    )
  }

  if (!conversation) {
    return <div className="flex h-full items-center justify-center text-sm text-white/35">Loading conversation...</div>
  }

  const displayName = getDisplayName(conversation.contact)
  const assignedMember = (teamQuery.data?.data ?? []).find((member) => member.id === conversation.assignedTo)

  return (
    <div className="flex h-full flex-col bg-card">
      <ConversationHeader
        conversation={{
          id: conversation.id,
          contactName: displayName,
          contactPhone: conversation.contact.phone,
          contactInitials: getInitials(displayName),
          contactColor: getAvatarColor(conversation.id),
          handledBy: conversation.handledBy,
          leadScore: conversation.leadScore,
          leadTier: getLeadTier(conversation.leadScore),
          isStarred: false,
          assignedAgentName: assignedMember?.name ?? null,
          language: conversation.detectedLang,
          messageCount: conversation.messages.length,
        }}
        teamMembers={teamQuery.data?.data ?? []}
        onHandoffToggle={() => updateConversationMutation.mutate({ handledBy: conversation.handledBy === 'ai' ? 'human' : 'ai' })}
        onAssign={(teamMemberId) => updateConversationMutation.mutate({ assignedTo: teamMemberId })}
        onArchive={() => updateConversationMutation.mutate({ status: 'archived' })}
        onDelete={() => window.confirm('Delete this conversation?') && fetch(`/api/v1/conversations/bulk`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [conversation.id] }),
        }).then(async (res) => {
          if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
            throw new Error(payload?.error?.message || 'Delete failed')
          }
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }).catch((error: Error) => {
          toast.error(error.message)
        })}
        onStar={() => toast.info('Starred list is session-scoped in this build')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {groupedMessages.map((entry, index) =>
          entry.type === 'day' ? (
            <div key={`${entry.label}-${index}`} className="my-4 flex justify-center">
              <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-[11px] text-white/35">
                {entry.label}
              </span>
            </div>
          ) : entry.message ? (
            <MessageItem
              key={entry.message.id}
              message={entry.message}
              onCopy={(content) => navigator.clipboard.writeText(content).then(() => toast.success('Copied'))}
              onDelete={(messageId) => deleteMessageMutation.mutate(messageId)}
              onForward={() => toast.info('Forward to agent action is ready for backend transport wiring')}
            />
          ) : null,
        )}
        <div id="message-scroll-anchor" />
      </div>

      <MessageInput conversationId={conversation.id} agentId={assignedMember?.id ?? null} />
    </div>
  )
}

export default MessageThread
