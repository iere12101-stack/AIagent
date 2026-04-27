'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  Search,
  SendHorizontal,
  UserPlus,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  Mail,
  Clock,
  Brain,
  User,
  Calendar,
  Bot,
  Inbox,
  MapPin,
  Home,
  DollarSign,
  BedDouble,
  Target,
  Timer,
  Loader2,
  AlertCircle,
  Sparkles,
  Eye,
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  Star,
  ClipboardCopy,
  Forward,
  Info,
  MessageCircle,
  Tag,
  X,
  Check,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, PRESET_LABELS } from '@/lib/store'
import { QuickReplies } from '@/components/inbox/QuickReplies'
import { ConversationInsights } from '@/components/inbox/ConversationInsights'
import { ContactTimeline } from '@/components/inbox/ContactTimeline'
import { ContactQuickView } from '@/components/contacts/ContactQuickView'
import { PropertyMatchPanel } from '@/components/properties/PropertyMatchPanel'
import { useAuthProfile } from '@/lib/use-auth-profile'

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

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (msgDate.getTime() === today.getTime()) return 'Today'
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

function formatMemoryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => formatMemoryValue(entry))
      .filter((entry) => entry && entry !== '—')
      .join(', ')
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[Object]'
    }
  }

  return String(value)
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

function getLeadScoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-gray-400'
}

function getLeadScoreStroke(score: number): string {
  if (score >= 70) return 'stroke-emerald-500'
  if (score >= 40) return 'stroke-amber-500'
  return 'stroke-gray-400'
}

function getLeadStatusColor(status: string): string {
  switch (status) {
    case 'hot': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    case 'warm': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'cold': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    case 'converted': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
    case 'lost': return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }
}

const SUGGESTED_REPLIES = [
  { text: 'Thank you for your interest! Let me check our available properties.', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900' },
  { text: 'Would you like to schedule a property viewing?', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900' },
  { text: 'I can send you more details about this property.', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900' },
  { text: "What's your budget range and preferred area?", bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900' },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface ContactBasic {
  id: string
  name: string | null
  phone: string
  pushName: string | null
  leadScore: number
  leadStatus: string
}

interface ConversationListItem {
  id: string
  orgId: string
  contactId: string
  status: string
  handledBy: string
  assignedTo: string | null
  leadScore: number
  detectedIntent: string | null
  detectedLang: string
  lastMessageAt: string | null
  unreadCount: number
  contact: ContactBasic
  lastMessagePreview?: string
  lastMessageSenderType?: string | null
}

interface Message {
  id: string
  conversationId: string
  direction: string
  senderType: string
  senderName: string | null
  content: string
  messageType: string
  metadata: string | null
  createdAt: string
}

interface ContactMemory {
  id?: string
  contactId?: string
  key: string
  value: unknown
  updatedAt?: string
}

interface ConversationDetail {
  id: string
  orgId: string
  contactId: string
  status: string
  handledBy: string
  assignedTo: string | null
  leadScore: number
  detectedIntent: string | null
  detectedLang: string
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
  contact: ContactBasic & { intent: string | null }
  messages: Message[]
}

type FilterTab = 'all' | 'ai' | 'human' | 'unread' | 'starred'

// ── Lead Score Circle ────────────────────────────────────────────────────────

function LeadScoreCircle({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={5}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={getLeadScoreStroke(score)}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-foreground text-sm font-bold"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {score}
      </text>
    </svg>
  )
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MessageThreadSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      <div className="flex gap-2 max-w-[70%]">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-56 rounded-2xl rounded-bl-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 max-w-[70%] ml-auto">
        <Skeleton className="h-20 w-64 rounded-2xl rounded-br-sm" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex gap-2 max-w-[70%]">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 max-w-[70%] ml-auto">
        <Skeleton className="h-14 w-52 rounded-2xl rounded-br-sm" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

// ── Empty States ─────────────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No conversations</h3>
      <p className="text-sm text-muted-foreground max-w-[240px]">
        Conversations will appear here when contacts send messages on WhatsApp.
      </p>
    </div>
  )
}

function EmptyThread() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-[260px]">
        Choose a conversation from the list to view messages and respond.
      </p>
    </div>
  )
}

function EmptyFilterState({ filter }: { filter: FilterTab }) {
  const config: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
    all: { icon: <Inbox className="h-8 w-8 text-muted-foreground" />, title: 'No conversations', description: 'Conversations will appear here when contacts send messages on WhatsApp.' },
    ai: { icon: <Bot className="h-8 w-8 text-muted-foreground" />, title: 'No AI handled conversations', description: 'Conversations managed by AI will appear here.' },
    human: { icon: <User className="h-8 w-8 text-muted-foreground" />, title: 'No human handled conversations', description: 'Conversations handed off to human agents will appear here.' },
    unread: { icon: <MessageCircle className="h-8 w-8 text-muted-foreground" />, title: 'No unread messages', description: 'All caught up! Unread conversations will appear here.' },
    starred: { icon: <Star className="h-8 w-8 text-muted-foreground" />, title: 'No starred conversations', description: 'Star important conversations for quick access.' },
  }
  const { icon, title, description } = config[filter] || config.all
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[240px]">
        {description}
      </p>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function InboxPage() {
  const {
    selectedConversationId,
    setSelectedConversation,
    setCurrentPage,
    setSelectedContact,
    conversationLabels,
    setConversationLabel,
    removeConversationLabel,
  } = useAppStore()

  // ── Local State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [newMessage, setNewMessage] = useState('')
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false)
  const [newConvoDialogOpen, setNewConvoDialogOpen] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [labelPopoverOpenId, setLabelPopoverOpenId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const authProfile = useAuthProfile()

  // ── Queries ─────────────────────────────────────────────────────────────
  const conversationsQuery = useQuery<{ data: ConversationListItem[]; nextCursor: string | null; total: number }>({
    queryKey: ['conversations', filterTab],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' })
      if (filterTab === 'ai') params.set('handledBy', 'ai')
      else if (filterTab === 'human') params.set('handledBy', 'human')
      else if (filterTab === 'unread') params.set('status', 'active')
      return fetch(`/api/conversations?${params}`, { cache: 'no-store', credentials: 'include' }).then((r) => r.json())
    },
  })

  const conversationDetailQuery = useQuery<{ data: ConversationDetail }>({
    queryKey: ['conversation', selectedConversationId],
    queryFn: () => fetch(`/api/conversations/${selectedConversationId}`, { cache: 'no-store', credentials: 'include' }).then((r) => r.json()),
    enabled: !!selectedConversationId,
    refetchInterval: 10000,
  })

  const contactDetailQuery = useQuery<{ data: { id: string; name: string | null; phone: string; email: string | null; pushName: string | null; leadScore: number; leadStatus: string; language: string; intent: string | null; areaInterest: string | null; budget: string | null; bedrooms: string | null; timeline: string | null; memory: ContactMemory[]; conversationCount: number } }>({
    queryKey: ['contact-detail', conversationDetailQuery.data?.data?.contactId],
    queryFn: () =>
      fetch(`/api/contacts/${conversationDetailQuery.data!.data.contactId}`, {
        cache: 'no-store',
        credentials: 'include',
      }).then((r) => r.json()),
    enabled: !!conversationDetailQuery.data?.data?.contactId,
  })

  // ── Derived Data (moved up for use in mutations) ───────────────────
  const conversations = conversationsQuery.data?.data ?? []
  const conversation = conversationDetailQuery.data?.data ?? null
  const messages = conversation?.messages ?? []
  const contactDetail = contactDetailQuery.data?.data ?? null

  // ── Contact memory map for AI responses ──────────────────────────────
  const contactMemoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (contactDetail?.memory) {
      for (const mem of contactDetail.memory) {
        map[mem.key] = formatMemoryValue(mem.value)
      }
    }
    if (contactDetail?.areaInterest) map.area_interest = contactDetail.areaInterest
    if (contactDetail?.budget) map.budget = contactDetail.budget
    if (contactDetail?.bedrooms) map.bedrooms = contactDetail.bedrooms
    if (contactDetail?.name || conversation?.contact?.name) map.name = (contactDetail?.name || conversation?.contact?.name || '')!
    return map
  }, [contactDetail, conversation])

  // ── Mutations ───────────────────────────────────────────────────────────
  const sendAIMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, direction: 'outbound', senderType: 'ai', senderName: 'Aya AI' }),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      setIsAITyping(false)
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: () => {
      setIsAITyping(false)
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'outbound',
          senderType: 'human',
          senderName: authProfile.displayName,
        }),
      }).then((r) => r.json())
    },
    onSuccess: (_data, variables) => {
      setNewMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handoffMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handledBy: 'human' }),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      setHandoffDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // ── (Derived data moved above for use in mutations) ─────────────────

  const filteredConversations = useMemo(() => {
    let result = conversations
    if (filterTab === 'starred') {
      result = result.filter((c) => starredIds.has(c.id))
    }
    // Filter by label
    if (labelFilter !== 'all') {
      result = result.filter((c) => {
        const labels = conversationLabels[c.id] || []
        return labels.includes(labelFilter)
      })
    }
    if (!search.trim()) {
      // Sort starred to top when not on starred filter
      if (filterTab !== 'starred') {
        result = [...result].sort((a, b) => {
          const aStarred = starredIds.has(a.id) ? 0 : 1
          const bStarred = starredIds.has(b.id) ? 0 : 1
          return aStarred - bStarred
        })
      }
      return result
    }
    const q = search.toLowerCase()
    const searched = result.filter(
      (c) =>
        (c.contact.name?.toLowerCase().includes(q)) ||
        (c.contact.pushName?.toLowerCase().includes(q)) ||
        (c.contact.phone.includes(q))
    )
    return searched.sort((a, b) => {
      const aStarred = starredIds.has(a.id) ? 0 : 1
      const bStarred = starredIds.has(b.id) ? 0 : 1
      return aStarred - bStarred
    })
  }, [conversations, search, starredIds, filterTab, labelFilter, conversationLabels])

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    if ((messages.length > 0 || isAITyping) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isAITyping])

  // ── Auto-resize textarea ────────────────────────────────────────────────
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`
  }, [])

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedConversationId || sendMessageMutation.isPending) return
    sendMessageMutation.mutate({ conversationId: selectedConversationId, content: newMessage.trim() })
  }, [newMessage, selectedConversationId, sendMessageMutation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversation(id)
    setMobileShowThread(true)
  }, [setSelectedConversation])

  const handleBackToList = useCallback(() => {
    setMobileShowThread(false)
    setSelectedConversation(null)
  }, [setSelectedConversation])

  const handleViewFullProfile = useCallback(() => {
    if (conversation?.contactId) {
      setSelectedContact(conversation.contactId)
      setCurrentPage('contacts')
    }
  }, [conversation, setSelectedContact, setCurrentPage])

  const handleHandoff = useCallback(() => {
    if (selectedConversationId) {
      handoffMutation.mutate(selectedConversationId)
    }
  }, [selectedConversationId, handoffMutation])

  const handleToggleStar = useCallback((e: React.MouseEvent, convoId: string) => {
    e.stopPropagation()
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(convoId)) {
        next.delete(convoId)
      } else {
        next.add(convoId)
      }
      return next
    })
  }, [])

  const handleCopyMessage = useCallback(async (e: React.MouseEvent, content: string, msgId: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMsgId(msgId)
      setTimeout(() => setCopiedMsgId(null), 2000)
    } catch {
      // Fallback: do nothing silently
    }
  }, [])

  const handleSuggestedReply = useCallback((text: string) => {
    setNewMessage(text)
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
    }
  }, [])

  // ── Contact name helper ─────────────────────────────────────────────────
  const getContactName = useCallback((c: ContactBasic) => {
    return c.pushName || c.name || formatPhone(c.phone)
  }, [])

  // ── Message date grouping ───────────────────────────────────────────────
  const messagesByDate = useMemo(() => {
    const groups: { label: string; messages: Message[] }[] = []
    let currentLabel = ''
    for (const msg of messages) {
      const label = getDateLabel(msg.createdAt)
      if (label !== currentLabel) {
        groups.push({ label, messages: [msg] })
        currentLabel = label
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [messages])

  // ── Filter tabs config ──────────────────────────────────────────────────
  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'starred', label: 'Starred' },
    { key: 'ai', label: 'AI Handled' },
    { key: 'human', label: 'Human' },
    { key: 'unread', label: 'Unread' },
  ]

  // ── Memory field labels ─────────────────────────────────────────────────
  const memoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    area_interest: { label: 'Area Interest', icon: <MapPin className="h-3.5 w-3.5" /> },
    budget: { label: 'Budget', icon: <DollarSign className="h-3.5 w-3.5" /> },
    bedrooms: { label: 'Bedrooms', icon: <BedDouble className="h-3.5 w-3.5" /> },
    intent: { label: 'Intent', icon: <Target className="h-3.5 w-3.5" /> },
    timeline: { label: 'Timeline', icon: <Timer className="h-3.5 w-3.5" /> },
    purchased_property: { label: 'Purchased', icon: <Home className="h-3.5 w-3.5" /> },
    name: { label: 'Name', icon: <User className="h-3.5 w-3.5" /> },
    language: { label: 'Language', icon: <Sparkles className="h-3.5 w-3.5" /> },
  }

  // ── Sender type icon for preview ──────────────────────────────────────
  const getSenderTypeIcon = useCallback((senderType?: string | null) => {
    if (senderType === 'ai') return <Bot className="h-3 w-3 text-emerald-500 shrink-0" />
    if (senderType === 'human') return <User className="h-3 w-3 text-blue-500 shrink-0" />
    if (senderType === 'system') return <Info className="h-3 w-3 text-amber-500 shrink-0" />
    return <MessageCircle className="h-3 w-3 text-muted-foreground shrink-0" />
  }, [])

  // ── Sentiment detection from live message content ───────────────────
  const sentimentConfig = useMemo(() => {
    if (!messages.length) return null

    const positiveWords = ['thanks', 'thank', 'great', 'good', 'interested', 'yes', 'sure', 'please', 'شكرا', 'ممتاز', 'رائع']
    const negativeWords = ['human', 'agent', 'manager', 'useless', 'awful', 'cancel', 'complaint', 'angry', 'frustrated', 'انسان', 'مدير', 'غاضب', 'شكوى']

    let score = 0

    for (const message of messages) {
      if (message.direction !== 'inbound') continue
      const content = message.content.toLowerCase()
      if (positiveWords.some((word) => content.includes(word))) score += 1
      if (negativeWords.some((word) => content.includes(word))) score -= 1
    }

    if (score > 0) {
      return {
        emoji: '\u{1F60A}',
        label: 'Positive',
        classes: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
      }
    }

    if (score < 0) {
      return {
        emoji: '\u{1F61F}',
        label: 'Negative',
        classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
      }
    }

    return {
      emoji: '\u{1F610}',
      label: 'Neutral',
      classes: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    }
  }, [messages])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col -m-6 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LEFT PANEL — Conversation List                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`w-full md:w-[320px] shrink-0 border-r flex flex-col bg-background ${
          mobileShowThread ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search + New Conversation */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm glass-input"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 shrink-0"
                onClick={() => setNewConvoDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">New</span>
              </Button>
            </div>
          </div>

          {/* Filter Tabs + Label Filter */}
          <div className="border-b">
            <div className="flex px-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative whitespace-nowrap ${
                    filterTab === tab.key
                      ? 'text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {tab.key === 'starred' && <Star className="h-3 w-3" fill={filterTab === tab.key ? 'currentColor' : 'none'} />}
                    {tab.label}
                    {tab.key === 'starred' && starredIds.size > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                        {starredIds.size}
                      </span>
                    )}
                  </span>
                  {filterTab === tab.key && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            {/* Label Filter Dropdown */}
            <div className="px-3 pb-2 pt-1">
              <Select value={labelFilter} onValueChange={setLabelFilter}>
                <SelectTrigger className="h-8 text-xs gap-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <SelectValue placeholder="Filter by label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labels</SelectItem>
                  {PRESET_LABELS.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full bg-${label.color}-500`} />
                        {label.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1 scrollbar-thin">
            {conversationsQuery.isLoading ? (
              <ConversationListSkeleton />
            ) : filteredConversations.length === 0 ? (
              <EmptyFilterState filter={filterTab} />
            ) : (
              <div className="p-1.5">
                {filteredConversations.map((convo) => {
                  const isSelected = convo.id === selectedConversationId
                  const displayName = getContactName(convo.contact)
                  const isStarred = starredIds.has(convo.id)
                  const isUnread = convo.unreadCount > 0
                  const convoLabels = conversationLabels[convo.id] || []
                  const visibleLabels = convoLabels.slice(0, 2)
                  const overflowCount = convoLabels.length - 2
                  return (
                    <div key={convo.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectConversation(convo.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleSelectConversation(convo.id)
                          }
                        }}
                        className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all duration-150 group interactive-row cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500 dark:bg-emerald-950/50'
                            : 'hover:bg-accent border-l-[3px] border-l-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <ContactQuickView contactId={convo.contactId}>
                          <div className="relative shrink-0">
                            <Avatar className="h-11 w-11">
                              <AvatarFallback className={`${getAvatarColor(convo.id)} text-sm font-semibold`}>
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Lead score dot */}
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getLeadScoreColor(convo.leadScore)}`} />
                          </div>
                        </ContactQuickView>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>
                              {displayName}
                            </span>
                            <span className={`text-[11px] shrink-0 ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {convo.lastMessageAt ? formatTimeAgo(convo.lastMessageAt) : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-xs truncate max-w-[160px] ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {convo.lastMessagePreview || 'No messages yet'}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {isUnread && (
                                <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                                  {convo.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Label Chips */}
                          {convoLabels.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {visibleLabels.map((labelId) => {
                                const label = PRESET_LABELS.find((l) => l.id === labelId)
                                if (!label) return null
                                return (
                                  <span
                                    key={labelId}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${label.bgColor} ${label.textColor}`}
                                  >
                                    {label.name}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeConversationLabel(convo.id, labelId)
                                      }}
                                      className="hover:opacity-70 transition-opacity"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                )
                              })}
                              {overflowCount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                                  +{overflowCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Star toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(e, convo.id)}
                          className={`shrink-0 p-1 rounded-full transition-colors hover:bg-muted ${
                            isStarred ? 'text-amber-500' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={isStarred ? 'Unstar conversation' : 'Star conversation'}
                        >
                          <Star className="h-4 w-4" fill={isStarred ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      {/* Label Toggle Popover */}
                      <div className="px-2 pb-1">
                        <Popover open={labelPopoverOpenId === convo.id} onOpenChange={(open) => setLabelPopoverOpenId(open ? convo.id : null)}>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setLabelPopoverOpenId(labelPopoverOpenId === convo.id ? null : convo.id)
                              }}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              <span>Labels</span>
                              {convoLabels.length > 0 && (
                                <span className="bg-muted rounded-full px-1 text-[9px] font-medium">{convoLabels.length}</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="start" className="w-52 p-2">
                            <div className="space-y-0.5">
                              {PRESET_LABELS.map((label) => {
                                const isActive = convoLabels.includes(label.id)
                                return (
                                  <button
                                    key={label.id}
                                    onClick={() => {
                                      if (isActive) {
                                        removeConversationLabel(convo.id, label.id)
                                      } else {
                                        setConversationLabel(convo.id, label.id)
                                      }
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                                      isActive
                                        ? `${label.bgColor} ${label.textColor}`
                                        : 'hover:bg-muted text-foreground'
                                    }`}
                                  >
                                    <span className={`flex items-center justify-center h-4 w-4 rounded border shrink-0 ${
                                      isActive
                                        ? `bg-${label.color}-500 border-${label.color}-500`
                                        : 'border-muted-foreground/30'
                                    }`}>
                                      {isActive && <Check className="h-2.5 w-2.5 text-white" />}
                                    </span>
                                    {label.name}
                                  </button>
                                )
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CENTER PANEL — Message Thread                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`flex-1 flex flex-col min-w-0 bg-muted/30 ${
          !mobileShowThread ? 'hidden md:flex' : 'flex'
        }`}>
          {!selectedConversationId || !conversation ? (
            <EmptyThread />
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={`${getAvatarColor(conversation.id)} text-xs font-semibold`}>
                      {getInitials(getContactName(conversation.contact))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">
                        {getContactName(conversation.contact)}
                      </h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {conversation.contact.leadScore}
                      </Badge>
                      {conversation.handledBy === 'ai' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 h-4 gap-1">
                          <Bot className="h-3 w-3" /> AI
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                          <User className="h-3 w-3" /> Human
                        </Badge>
                      )}
                      {sentimentConfig && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 gap-1 ${sentimentConfig.classes}`}>
                          {sentimentConfig.emoji} {sentimentConfig.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatPhone(conversation.contact.phone)}
                      {conversation.detectedLang && (
                        <span className="ml-2 uppercase">{conversation.detectedLang}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Star toggle in header */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleToggleStar(e, conversation.id)}
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${starredIds.has(conversation.id) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`}
                            fill={starredIds.has(conversation.id) ? 'currentColor' : 'none'}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{starredIds.has(conversation.id) ? 'Unstar conversation' : 'Star conversation'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {conversation.handledBy === 'ai' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-8"
                            onClick={() => setHandoffDialogOpen(true)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Handoff</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hand off to human agent</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hidden lg:flex"
                          onClick={() => setShowRightPanel(!showRightPanel)}
                        >
                          {showRightPanel ? (
                            <PanelRightClose className="h-4 w-4" />
                          ) : (
                            <PanelRightOpen className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showRightPanel ? 'Hide info' : 'Show info'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Conversation Info Bar */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
                {/* Lead score badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`h-2 w-2 rounded-full ${getLeadScoreColor(conversation.leadScore)}`} />
                  <span className="text-xs text-muted-foreground">Score</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-semibold">
                    {conversation.leadScore}
                  </Badge>
                </div>
                <Separator orientation="vertical" className="h-4 shrink-0" />
                {/* Detected intent */}
                {conversation.detectedIntent && (
                  <>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Intent</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        {conversation.detectedIntent}
                      </Badge>
                    </div>
                    <Separator orientation="vertical" className="h-4 shrink-0" />
                  </>
                )}
                {/* Language */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground">Lang</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {conversation.detectedLang === 'ar' ? '🇦🇪 AR' : '🇬🇧 EN'}
                  </Badge>
                </div>
                <Separator orientation="vertical" className="h-4 shrink-0" />
                {/* Message count */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{messages.length} messages</span>
                </div>
              </div>

              {/* Messages */}
              {conversationDetailQuery.isLoading ? (
                <MessageThreadSkeleton />
              ) : (
                <ScrollArea className="flex-1 px-4 scrollbar-thin">
                  <div className="py-4 space-y-6 max-w-3xl mx-auto">
                    {messagesByDate.map((group, groupIndex) => (
                      <div key={`${group.label}-${groupIndex}`}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                          <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full font-medium">
                            {group.label}
                          </span>
                        </div>

                        {/* Messages */}
                        <div className="space-y-3">
                          {group.messages.map((msg) => {
                            // System message
                            if (msg.senderType === 'system') {
                              return (
                                <div key={msg.id} className="flex justify-center">
                                  <span className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300 text-xs px-3 py-1.5 rounded-lg max-w-[80%] text-center">
                                    {msg.content}
                                  </span>
                                </div>
                              )
                            }

                            // Inbound (from contact)
                            if (msg.direction === 'inbound') {
                              return (
                                <div key={msg.id} className="flex gap-2 max-w-[75%] group/msg relative">
                                  <Avatar className="h-7 w-7 shrink-0 mt-1">
                                    <AvatarFallback className={`${getAvatarColor(conversation.contactId)} text-[10px] font-semibold`}>
                                      {getInitials(getContactName(conversation.contact))}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2 relative">
                                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                      {/* Message Actions */}
                                      <div className="absolute -top-2 -right-2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-background border rounded-md shadow-sm p-0.5">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => handleCopyMessage(e, msg.content, msg.id)}
                                                className="p-1 rounded hover:bg-muted transition-colors"
                                              >
                                                {copiedMsgId === msg.id ? (
                                                  <ClipboardCopy className="h-3 w-3 text-emerald-600" />
                                                ) : (
                                                  <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                                                )}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              {copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <button className="p-1 rounded hover:bg-muted transition-colors">
                                                    <Forward className="h-3 w-3 text-muted-foreground" />
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent side="top" className="w-48 p-2">
                                                  <p className="text-xs text-muted-foreground mb-1.5">Forward to...</p>
                                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                                    <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Select recipient</span>
                                                  </div>
                                                </PopoverContent>
                                              </Popover>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">Forward</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                                      {formatMessageTime(msg.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              )
                            }

                            // Outbound AI
                            if (msg.senderType === 'ai') {
                              return (
                                <div key={msg.id} className="flex flex-col items-end max-w-[75%] ml-auto group/msg relative">
                                  <span className="text-[10px] text-emerald-600 font-medium mb-1 mr-1 flex items-center gap-1">
                                    <Bot className="h-3 w-3" /> Aya AI
                                  </span>
                                  <div className="bg-emerald-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 relative">
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    {/* Message Actions */}
                                    <div className="absolute -top-2 -left-2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-background border rounded-md shadow-sm p-0.5">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => handleCopyMessage(e, msg.content, msg.id)}
                                              className="p-1 rounded hover:bg-muted transition-colors"
                                            >
                                              {copiedMsgId === msg.id ? (
                                                <ClipboardCopy className="h-3 w-3 text-emerald-600" />
                                              ) : (
                                                <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                                              )}
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            {copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <button className="p-1 rounded hover:bg-muted transition-colors">
                                                  <Forward className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent side="top" className="w-48 p-2">
                                                <p className="text-xs text-muted-foreground mb-1.5">Forward to...</p>
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                                  <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                                                  <span className="text-xs text-muted-foreground">Select recipient</span>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">Forward</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-1 mr-1">
                                    {formatMessageTime(msg.createdAt)}
                                  </p>
                                </div>
                              )
                            }

                            // Outbound Human
                            if (msg.senderType === 'human') {
                              return (
                                <div key={msg.id} className="flex flex-col items-end max-w-[75%] ml-auto group/msg relative">
                                  <span className="text-[10px] text-blue-600 font-medium mb-1 mr-1 flex items-center gap-1">
                                    <User className="h-3 w-3" /> {msg.senderName || 'Agent'}
                                  </span>
                                  <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 relative">
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    {/* Message Actions */}
                                    <div className="absolute -top-2 -left-2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-background border rounded-md shadow-sm p-0.5">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => handleCopyMessage(e, msg.content, msg.id)}
                                              className="p-1 rounded hover:bg-muted transition-colors"
                                            >
                                              {copiedMsgId === msg.id ? (
                                                <ClipboardCopy className="h-3 w-3 text-emerald-600" />
                                              ) : (
                                                <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                                              )}
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            {copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <button className="p-1 rounded hover:bg-muted transition-colors">
                                                  <Forward className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent side="top" className="w-48 p-2">
                                                <p className="text-xs text-muted-foreground mb-1.5">Forward to...</p>
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                                  <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                                                  <span className="text-xs text-muted-foreground">Select recipient</span>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">Forward</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-1 mr-1">
                                    {formatMessageTime(msg.createdAt)}
                                  </p>
                                </div>
                              )
                            }

                            return null
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Typing Indicator */}
                    {isAITyping && (
                      <div className="flex gap-2 max-w-[75%]">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 font-medium mb-1 ml-1 block">
                            Aya AI is typing
                          </span>
                          <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="typing-dot h-2 w-2 rounded-full bg-emerald-600" />
                              <span className="typing-dot h-2 w-2 rounded-full bg-emerald-600" />
                              <span className="typing-dot h-2 w-2 rounded-full bg-emerald-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}

              {/* Insights Panel */}
              <ConversationInsights
                messages={messages}
                contact={conversation.contact}
                detectedLang={conversation.detectedLang}
                detectedIntent={conversation.detectedIntent}
                leadScore={conversation.leadScore}
              />

              {/* AI Smart Reply Suggestions */}
              <div className="px-4 pt-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span className="text-[11px] font-medium text-muted-foreground">AI Suggested Replies</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {SUGGESTED_REPLIES.map((reply) => (
                    <button
                      key={reply.text}
                      onClick={() => handleSuggestedReply(reply.text)}
                      className={`press-scale whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer ${reply.bg}`}
                    >
                      {reply.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Replies + Input Bar */}
              <QuickReplies onInsert={(text) => {
                setNewMessage(text)
                if (textareaRef.current) {
                  textareaRef.current.focus()
                }
              }} />
              <div className="border-t bg-background px-4 py-3">
                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 max-h-24 leading-relaxed"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT PANEL — Contact Info Sidebar                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {conversation && showRightPanel && (
          <div className="hidden lg:flex w-[300px] shrink-0 border-l flex-col bg-background">
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="p-4 space-y-5 glass-card">
                {/* Contact Card */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-16 w-16 mb-3">
                    <AvatarFallback className={`${getAvatarColor(conversation.id)} text-lg font-bold`}>
                      {getInitials(getContactName(conversation.contact))}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-base">{getContactName(conversation.contact)}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(conversation.contact.phone)}
                  </div>
                  {contactDetail?.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3" />
                      {contactDetail.email}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Lead Score */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Lead Score</span>
                  <LeadScoreCircle score={conversation.leadScore} size={72} />
                </div>

                {/* Status Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Lead Status</span>
                    <Badge variant="outline" className={`text-xs ${getLeadStatusColor(conversation.contact.leadStatus)}`}>
                      {conversation.contact.leadStatus.charAt(0).toUpperCase() + conversation.contact.leadStatus.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Language</span>
                    <Badge variant="outline" className="text-xs">
                      {conversation.detectedLang === 'ar' ? '🇦🇪 AR' : '🇬🇧 EN'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Memory */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Contact Memory
                  </h4>
                  {contactDetail && contactDetail.memory.length > 0 ? (
                    <div className="space-y-2">
                      {contactDetail.memory.map((mem, index) => {
                        const field = memoryLabels[mem.key]
                        return (
                          <div key={mem.id ?? `${mem.key}-${index}`} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/50">
                            <div className="mt-0.5 text-muted-foreground">
                              {field?.icon || <Sparkles className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {field?.label || mem.key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-sm font-medium break-words">{formatMemoryValue(mem.value)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No memory data yet
                    </p>
                  )}
                </div>

                <PropertyMatchPanel
                  area={contactDetail?.areaInterest}
                  budget={contactDetail?.budget}
                  bedrooms={contactDetail?.bedrooms}
                />

                {/* Activity Timeline */}
                <ContactTimeline
                  contactId={conversation.contactId}
                  contactName={getContactName(conversation.contact)}
                />

                {/* Conversation Metadata */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Conversation Info
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Handled by</span>
                      <span className={`font-medium ${conversation.handledBy === 'ai' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {conversation.handledBy === 'ai' ? '🤖 AI Bot' : '👤 Human Agent'}
                      </span>
                    </div>
                    {conversation.detectedIntent && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Detected intent</span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {conversation.detectedIntent}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Messages</span>
                      <span className="font-medium">{messages.length}</span>
                    </div>
                    {conversation.assignedTo && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned to</span>
                        <span className="font-medium">{conversation.assignedTo}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {new Date(conversation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="border-t p-4 space-y-2">
              <Button className="w-full gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700">
                <Calendar className="h-3.5 w-3.5" />
                Schedule Booking
              </Button>
              <Button variant="outline" className="w-full gap-2 text-xs h-9">
                <MessageSquare className="h-3.5 w-3.5" />
                Send Nudge
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 text-xs h-9 text-muted-foreground"
                onClick={handleViewFullProfile}
              >
                <Eye className="h-3.5 w-3.5" />
                View Full Profile
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Right panel toggle as FAB */}
      {conversation && !showRightPanel && (
        <button
          onClick={() => setShowRightPanel(true)}
          className="lg:hidden fixed bottom-20 right-4 z-50 h-11 w-11 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
        >
          <Eye className="h-5 w-5" />
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Handoff Confirmation Dialog                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Handoff to Human Agent
            </DialogTitle>
            <DialogDescription>
              This will transfer the conversation from AI to a human agent. The AI will stop responding automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
            <p><span className="text-muted-foreground">Contact:</span> <strong>{conversation ? getContactName(conversation.contact) : ''}</strong></p>
            <p><span className="text-muted-foreground">Current:</span> <span className="text-emerald-600 font-medium">AI Handled</span></p>
            <p><span className="text-muted-foreground">After:</span> <span className="text-blue-600 font-medium">Human Agent</span></p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setHandoffDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleHandoff}
              disabled={handoffMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {handoffMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Transferring...
                </>
              ) : (
                'Confirm Handoff'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Conversation Dialog */}
      <Dialog open={newConvoDialogOpen} onOpenChange={setNewConvoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              New Conversation
            </DialogTitle>
            <DialogDescription>About starting new conversations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-2 mt-0.5">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Conversations start automatically</p>
                  <p className="text-xs text-muted-foreground">
                    New conversations are created automatically when a contact sends a WhatsApp message to your connected device.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Device Status</h4>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-2">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Main Device</p>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 gap-1">
                      <Wifi className="h-2.5 w-2.5" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">+971 50 XXX XXXX · Receiving messages</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="rounded-full bg-muted p-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Backup Device</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <WifiOff className="h-2.5 w-2.5" />
                      Disconnected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewConvoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
