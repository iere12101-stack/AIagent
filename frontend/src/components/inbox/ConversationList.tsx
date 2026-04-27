'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Archive,
  Bell,
  Bot,
  CheckCheck,
  ChevronDown,
  Copy,
  Filter,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Star,
  Tag,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConversationListSkeleton } from '@/components/inbox/ConversationListSkeleton'
import { useInboxRealtime } from '@/hooks/useInboxRealtime'
import { useInboxShortcuts } from '@/hooks/useInboxShortcuts'
import { PRESET_LABELS, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  contactId: string
  handledBy: 'ai' | 'human'
  status: 'active' | 'resolved' | 'archived'
  leadScore: number
  detectedLang: 'en' | 'ar'
  lastMessageAt: string | null
  unreadCount: number
  assignedTo?: string | null
  contact: {
    id: string
    name: string | null
    phone: string
    pushName?: string | null
    leadStatus?: string
  }
  lastMessagePreview?: string | null
  lastMessageStatus?: 'sent' | 'delivered' | 'read' | 'failed' | null
}

interface TeamMember {
  id: string
  name: string
  role: string
}

type FilterTab = 'all' | 'starred' | 'ai' | 'human' | 'unread'

const tierColors: Record<string, string> = {
  VIP: 'border-[#D4A017]/30 bg-[#D4A017]/15 text-[#D4A017]',
  HOT: 'border-[#FF4545]/30 bg-[#FF4545]/15 text-[#FF4545]',
  WARM: 'border-[#25D453]/30 bg-[#25D453]/15 text-[#25D453]',
  COLD: 'border-white/10 bg-white/[0.06] text-white/40',
}

function getLeadTier(score: number): 'VIP' | 'HOT' | 'WARM' | 'COLD' {
  if (score >= 85) return 'VIP'
  if (score >= 65) return 'HOT'
  if (score >= 35) return 'WARM'
  return 'COLD'
}

function getDisplayName(conversation: Conversation): string {
  return conversation.contact.name || conversation.contact.pushName || conversation.contact.phone
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
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

function LabelFilterPopover({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (labels: string[]) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full justify-between border-white/[0.08] bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            {selected.length > 0 ? `${selected.length} labels selected` : 'All Labels'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 border-border bg-popover p-3 text-popover-foreground">
        <div className="space-y-2">
          {PRESET_LABELS.map((label) => {
            const checked = selected.includes(label.id)
            return (
              <label key={label.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.06]">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    onChange(
                      checked ? selected.filter((entry) => entry !== label.id) : [...selected, label.id],
                    )
                  }}
                />
            <span className="text-xs">{label.name}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ConversationList({
  selectedConvId,
  onSelect,
}: {
  selectedConvId: string | null
  onSelect: (conversationId: string, contactId: string) => void
}) {
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const { conversationLabels, setConversationLabel, removeConversationLabel } = useAppStore()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())

  const conversationsQuery = useQuery<{ data: Conversation[]; nextCursor: string | null }>({
    queryKey: ['conversations', cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (cursor) params.set('cursor', cursor)
      const response = await fetch(`/api/conversations?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch conversations')
      return response.json()
    },
    refetchInterval: 10_000,
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

  useInboxRealtime(selectedConvId)

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, labelFilter, search])

  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/v1/conversations/bulk', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'archived' }),
      })
      if (!response.ok) throw new Error('Archive failed')
    },
    onSuccess: () => {
      toast.success('Conversation updated')
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedIds(new Set())
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/v1/conversations/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(payload?.error?.message || 'Delete failed')
      }
    },
    onSuccess: () => {
      toast.success('Conversation deleted')
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedIds(new Set())
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: Record<string, unknown>
    }) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('Update failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    onError: (error: Error) => toast.error(error.message),
  })

  const filteredConversations = useMemo(() => {
    const conversations = conversationsQuery.data?.data ?? []

    return conversations.filter((conversation) => {
      const name = getDisplayName(conversation).toLowerCase()
      const phone = conversation.contact.phone.toLowerCase()
      const labels = conversationLabels[conversation.id] ?? []

      if (search && !name.includes(search.toLowerCase()) && !phone.includes(search.toLowerCase())) {
        return false
      }

      if (activeTab === 'starred' && !starredIds.has(conversation.id)) return false
      if (activeTab === 'ai' && conversation.handledBy !== 'ai') return false
      if (activeTab === 'human' && conversation.handledBy !== 'human') return false
      if (activeTab === 'unread' && conversation.unreadCount <= 0) return false
      if (labelFilter.length > 0 && !labelFilter.some((label) => labels.includes(label))) return false

      return conversation.status !== 'archived'
    })
  }, [activeTab, conversationLabels, conversationsQuery.data?.data, labelFilter, search, starredIds])

  const currentIndex = filteredConversations.findIndex((conversation) => conversation.id === selectedConvId)

  useInboxShortcuts({
    onArchive: () => {
      if (selectedIds.size > 0) {
        archiveMutation.mutate([...selectedIds])
      } else if (selectedConvId) {
        archiveMutation.mutate([selectedConvId])
      }
    },
    onDelete: () => {
      const ids = selectedIds.size > 0 ? [...selectedIds] : selectedConvId ? [selectedConvId] : []
      if (ids.length > 0 && window.confirm(`Delete ${ids.length} conversation(s)?`)) {
        deleteMutation.mutate(ids)
      }
    },
    onMarkRead: () => {
      const ids = selectedIds.size > 0 ? [...selectedIds] : selectedConvId ? [selectedConvId] : []
      ids.forEach((id) => updateMutation.mutate({ id, body: { unreadCount: 0 } }))
    },
    onNextConv: () => {
      const next = filteredConversations[currentIndex + 1]
      if (next) onSelect(next.id, next.contactId)
    },
    onPrevConv: () => {
      const previous = filteredConversations[currentIndex - 1]
      if (previous) onSelect(previous.id, previous.contactId)
    },
    onFocusSearch: () => searchRef.current?.focus(),
  })

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/40 hover:bg-white/[0.06] hover:text-white"
              onClick={() => conversationsQuery.refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-[#25D453] hover:bg-[#25D453]/10 hover:text-[#25D453]">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or phone..."
            className="h-8 border-input bg-background pl-8 text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)}>
          <TabsList className="h-7 w-full border border-border bg-background p-0.5">
            {[
              ['all', 'All'],
              ['starred', 'Starred'],
              ['ai', 'AI Handled'],
              ['human', 'Human'],
              ['unread', 'Unread'],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 rounded-sm border-b-2 border-transparent text-[10px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-2">
          <LabelFilterPopover selected={labelFilter} onChange={setLabelFilter} />
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-2 border-b border-[#25D453]/20 bg-[#25D453]/10 px-3 py-2">
          <span className="flex-1 text-xs font-medium text-[#25D453]">{selectedIds.size} selected</span>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/60 hover:bg-white/[0.06] hover:text-white" onClick={() => [...selectedIds].forEach((id) => updateMutation.mutate({ id, body: { unreadCount: 0 } }))}>
            <CheckCheck className="mr-1 h-3 w-3" />
            Read
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/60 hover:bg-white/[0.06] hover:text-white" onClick={() => archiveMutation.mutate([...selectedIds])}>
            <Archive className="mr-1 h-3 w-3" />
            Archive
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => window.confirm(`Delete ${selectedIds.size} conversations?`) && deleteMutation.mutate([...selectedIds])}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:bg-white/[0.06] hover:text-white" onClick={() => setSelectedIds(new Set())}>
            ×
          </Button>
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        {conversationsQuery.isLoading ? (
          <ConversationListSkeleton />
        ) : filteredConversations.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {filteredConversations.map((conversation) => {
              const displayName = getDisplayName(conversation)
              const tier = getLeadTier(conversation.leadScore)
              const labels = conversationLabels[conversation.id] ?? []
              const isSelected = selectedConvId === conversation.id
              const isChecked = selectedIds.has(conversation.id)
              const isStarred = starredIds.has(conversation.id)

              return (
                <ContextMenu key={conversation.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        'group relative flex cursor-pointer items-start gap-2.5 px-3 py-3 transition-colors hover:bg-muted/50',
                        isSelected && 'border-r-2 border-primary bg-primary/5',
                        isChecked && 'bg-primary/5',
                      )}
                      onClick={() => onSelect(conversation.id, conversation.contactId)}
                    >
                      <div className="pt-0.5" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedIds((previous) => {
                              const next = new Set(previous)
                              if (checked) next.add(conversation.id)
                              else next.delete(conversation.id)
                              return next
                            })
                          }}
                          className="border-white/20 data-[state=checked]:border-[#25D453] data-[state=checked]:bg-[#25D453]"
                        />
                      </div>

                      <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs font-semibold text-white" style={{ background: getAvatarColor(conversation.id) }}>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {conversation.lastMessageAt
                              ? formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })
                              : '-'}
                          </span>
                        </div>
                        <p className="mb-1.5 truncate text-xs text-muted-foreground">{conversation.lastMessagePreview || 'No messages yet'}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {conversation.lastMessageStatus === 'failed' ? (
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] text-red-300">
                              Send failed
                            </span>
                          ) : null}
                          <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', tierColors[tier])}>
                            {tier}
                          </span>
                          <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px]', conversation.handledBy === 'ai' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300')}>
                            {conversation.handledBy === 'ai' ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                            {conversation.handledBy === 'ai' ? 'Aya AI' : 'Human'}
                          </span>
                          {conversation.detectedLang === 'ar' ? (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] text-purple-700 dark:bg-purple-950 dark:text-purple-300">AR</span>
                          ) : null}
                          {labels.slice(0, 2).map((labelId) => {
                            const label = PRESET_LABELS.find((entry) => entry.id === labelId)
                            return label ? (
                              <span key={label.id} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/45">
                                {label.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>

                      {conversation.unreadCount > 0 ? (
                        <Badge className="mt-1 min-w-5 justify-center bg-[#25D453] px-1.5 text-[10px] text-black hover:bg-[#25D453]">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Badge>
                      ) : null}

                      <button
                        className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-yellow-600 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          setStarredIds((previous) => {
                            const next = new Set(previous)
                            if (next.has(conversation.id)) next.delete(conversation.id)
                            else next.add(conversation.id)
                            return next
                          })
                        }}
                      >
                        <Star className={cn('h-3.5 w-3.5', isStarred && 'fill-yellow-600 text-yellow-600')} />
                      </button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56 border-white/[0.08] bg-[#1a2235] text-white">
                    <ContextMenuItem
                      className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
                      onClick={() => {
                        setStarredIds((previous) => {
                          const next = new Set(previous)
                          if (next.has(conversation.id)) next.delete(conversation.id)
                          else next.add(conversation.id)
                          return next
                        })
                      }}
                    >
                      <Star className="h-3.5 w-3.5 text-yellow-300" />
                      {isStarred ? 'Unstar conversation' : 'Star conversation'}
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
                      onClick={() => navigator.clipboard.writeText(conversation.contact.phone).then(() => toast.success('Phone copied'))}
                    >
                      <Copy className="h-3.5 w-3.5 text-white/50" />
                      Copy phone number
                    </ContextMenuItem>
                    <ContextMenuSeparator className="bg-white/[0.06]" />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">
                        <UserPlus className="h-3.5 w-3.5 text-blue-300" />
                        Assign to agent
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-52 border-white/[0.08] bg-[#1a2235] text-white">
                        {(teamQuery.data?.data ?? []).map((member) => (
                          <ContextMenuItem
                            key={member.id}
                            className="text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
                            onClick={() => updateMutation.mutate({ id: conversation.id, body: { assignedTo: member.id } })}
                          >
                            {member.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">
                        <Tag className="h-3.5 w-3.5 text-purple-300" />
                        Add label
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-40 border-white/[0.08] bg-[#1a2235] text-white">
                        {PRESET_LABELS.map((label) => {
                          const hasLabel = labels.includes(label.id)
                          return (
                            <ContextMenuItem
                              key={label.id}
                              className="text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
                              onClick={() => (hasLabel ? removeConversationLabel(conversation.id, label.id) : setConversationLabel(conversation.id, label.id))}
                            >
                              {label.name}
                            </ContextMenuItem>
                          )
                        })}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]" onClick={() => updateMutation.mutate({ id: conversation.id, body: { unreadCount: conversation.unreadCount > 0 ? 0 : 1 } })}>
                      <CheckCheck className="h-3.5 w-3.5 text-[#25D453]" />
                      {conversation.unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
                      onClick={async () => {
                        const response = await fetch('/api/v1/nudges/send-now', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ contactId: conversation.contactId, conversationId: conversation.id }),
                        })
                        if (response.ok) toast.success('Nudge queued')
                        else toast.error('Failed to queue nudge')
                      }}
                    >
                      <Bell className="h-3.5 w-3.5 text-orange-300" />
                      Send nudge now
                    </ContextMenuItem>
                    <ContextMenuSeparator className="bg-white/[0.06]" />
                    <ContextMenuItem className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]" onClick={() => archiveMutation.mutate([conversation.id])}>
                      <Archive className="h-3.5 w-3.5 text-white/50" />
                      Archive conversation
                    </ContextMenuItem>
                    <ContextMenuItem className="gap-2 text-xs text-red-300 hover:bg-red-500/10 focus:bg-red-500/10" onClick={() => window.confirm('Delete this conversation?') && deleteMutation.mutate([conversation.id])}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete conversation
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <Mail className="mb-3 h-8 w-8 opacity-30" />
            <p className="text-xs">No conversations found</p>
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-white/25">
        [/] Search  [j/k] Navigate  [e] Archive  [#] Delete  [u] Read
        {conversationsQuery.data?.nextCursor ? (
          <button
            className="ml-2 text-[#25D453] hover:underline"
            onClick={() => setCursor(conversationsQuery.data?.nextCursor ?? null)}
          >
            Load older
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default ConversationList
