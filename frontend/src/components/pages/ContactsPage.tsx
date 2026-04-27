'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Flame,
  Thermometer,
  CheckCircle,
  Plus,
  Search,
  Eye,
  Edit3,
  X,
  MapPin,
  Home,
  DollarSign,
  BedDouble,
  Target,
  Timer,
  Phone,
  Mail,
  Sparkles,
  MessageSquare,
  CalendarDays,
  Clock,
  Send,
  ChevronLeft,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'
import { AddContactDialog } from '@/components/contacts/AddContactDialog'
import { ContactQuickView } from '@/components/contacts/ContactQuickView'
import { QuickActionsPanel } from '@/components/contacts/QuickActionsPanel'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Quick Filter Presets ────────────────────────────────────────────────────

const CONTACT_PRESETS: { id: string; label: string; icon: React.ReactNode; filterUpdate: { leadStatus?: string; intent?: string; language?: string } }[] = [
  { id: 'all', label: 'All Contacts', icon: <Users className="h-3.5 w-3.5" />, filterUpdate: {} },
  { id: 'hot', label: 'Hot Leads', icon: <Flame className="h-3.5 w-3.5" />, filterUpdate: { leadStatus: 'hot' } },
  { id: 'new', label: 'New Leads', icon: null, filterUpdate: { leadStatus: 'new' } },
  { id: 'buyers', label: 'Buyers', icon: null, filterUpdate: { intent: 'buy' } },
  { id: 'renters', label: 'Renters', icon: null, filterUpdate: { intent: 'rent' } },
  { id: 'investors', label: 'Investors', icon: null, filterUpdate: { intent: 'invest' } },
  { id: 'arabic', label: 'Arabic Speakers', icon: null, filterUpdate: { language: 'ar' } },
  { id: 'english', label: 'English Speakers', icon: null, filterUpdate: { language: 'en' } },
  { id: 'converted', label: 'Converted', icon: <CheckCircle className="h-3.5 w-3.5" />, filterUpdate: { leadStatus: 'converted' } },
]

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

function formatAED(value: string | number | null | undefined): string {
  if (!value) return '—'
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value
  if (isNaN(num)) return '—'
  if (num >= 1_000_000) return `AED ${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `AED ${(num / 1_000).toFixed(0)}K`
  return `AED ${num.toLocaleString()}`
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

function getLeadScoreBadgeColor(score: number): string {
  if (score >= 81) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (score >= 61) return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
  if (score >= 41) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  if (score >= 21) return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
  return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
}

function getLeadScoreStroke(score: number): string {
  if (score >= 81) return 'stroke-emerald-500'
  if (score >= 61) return 'stroke-green-500'
  if (score >= 41) return 'stroke-amber-500'
  if (score >= 21) return 'stroke-orange-500'
  return 'stroke-red-500'
}

function getLeadStatusAvatarBorder(status: string): string {
  switch (status) {
    case 'hot': return 'ring-2 ring-red-400'
    case 'warm': return 'ring-2 ring-amber-400'
    case 'cold': return 'ring-2 ring-blue-400'
    case 'converted': return 'ring-2 ring-emerald-400'
    case 'lost': return 'ring-2 ring-gray-400'
    default: return 'ring-2 ring-gray-300'
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Contact {
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
}

interface ContactMemory {
  id: string
  contactId: string
  key: string
  value: string
  updatedAt: string
}

interface ContactDetail extends Contact {
  memory: ContactMemory[]
  conversationCount: number
}

interface AnalyticsData {
  totalContacts: number
  hotLeads: number
  warmLeads: number
  convertedLeads: number
  [key: string]: unknown
}

// ── Lead Score Circle ────────────────────────────────────────────────────────

function LeadScoreCircle({ score, size = 72 }: { score: number; size?: number }) {
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

// ── Memory Icons ─────────────────────────────────────────────────────────────

const memoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  area_interest: { label: 'Area Interest', icon: <MapPin className="h-3.5 w-3.5" /> },
  budget: { label: 'Budget', icon: <DollarSign className="h-3.5 w-3.5" /> },
  bedrooms: { label: 'Bedrooms', icon: <BedDouble className="h-3.5 w-3.5" /> },
  intent: { label: 'Intent', icon: <Target className="h-3.5 w-3.5" /> },
  timeline: { label: 'Timeline', icon: <Timer className="h-3.5 w-3.5" /> },
  purchased_property: { label: 'Purchased', icon: <Home className="h-3.5 w-3.5" /> },
  name: { label: 'Name', icon: <Users className="h-3.5 w-3.5" /> },
  language: { label: 'Language', icon: <Sparkles className="h-3.5 w-3.5" /> },
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyContacts({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No contacts found</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-4">
        Try adjusting your filters or search terms to find contacts.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        <X className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ContactsPage() {
  const { setCurrentPage, setSelectedContact, setSelectedConversation } = useAppStore()
  const queryClient = useQueryClient()

  // ── Filter State ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [leadStatus, setLeadStatus] = useState('all')
  const [intent, setIntent] = useState('all')
  const [language, setLanguage] = useState('all')
  const [cursor, setCursor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string>('all')

  const hasFilters = search || leadStatus !== 'all' || intent !== 'all' || language !== 'all'

  const clearFilters = useCallback(() => {
    setSearch('')
    setLeadStatus('all')
    setIntent('all')
    setLanguage('all')
    setCursor(null)
    setActivePreset('all')
  }, [])

  // Clear active preset when user manually changes filters
  const clearActivePreset = useCallback(() => {
    setActivePreset('')
  }, [])

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = CONTACT_PRESETS.find((p) => p.id === presetId)
      if (!preset) return

      if (presetId === 'all') {
        clearFilters()
        return
      }

      // Reset all filters then apply preset
      setSearch('')
      setLeadStatus(preset.filterUpdate.leadStatus || 'all')
      setIntent(preset.filterUpdate.intent || 'all')
      setLanguage(preset.filterUpdate.language || 'all')
      setCursor(null)
      setActivePreset(presetId)
    },
    [clearFilters]
  )

  // ── Queries ───────────────────────────────────────────────────────────
  const analyticsQuery = useQuery<{ data: AnalyticsData }>({
    queryKey: ['analytics-summary'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 60000,
  })

  const contactsQuery = useQuery<{ data: Contact[]; nextCursor: string | null; total: number }>({
    queryKey: ['contacts', search, leadStatus, intent, language, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20' })
      if (search) params.set('search', search)
      if (leadStatus !== 'all') params.set('leadStatus', leadStatus)
      if (intent !== 'all') params.set('intent', intent)
      if (language !== 'all') params.set('language', language)
      if (cursor) params.set('cursor', cursor)
      return fetch(`/api/contacts?${params}`).then((r) => r.json())
    },
  })

  const allContacts = contactsQuery.data?.data ?? []
  const nextCursor = contactsQuery.data?.nextCursor ?? null
  const total = contactsQuery.data?.total ?? 0

  const contactDetailQuery = useQuery<{ data: ContactDetail }>({
    queryKey: ['contact-detail', selectedContactId],
    queryFn: () => fetch(`/api/contacts/${selectedContactId}`).then((r) => r.json()),
    enabled: !!selectedContactId && sheetOpen,
  })

  // ── Mutations ─────────────────────────────────────────────────────────
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return fetch(`/api/contacts/${id}`, {

        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contact-detail', selectedContactId] })
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] })
      setEditingStatus(false)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleViewContact = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id)
    setNewStatus(contact.leadStatus)
    setSheetOpen(true)
  }, [])

  const handleStatusChange = useCallback((status: string) => {
    setNewStatus(status)
    if (selectedContactId) {
      updateContactMutation.mutate({ id: selectedContactId, data: { leadStatus: status } })
    }
  }, [selectedContactId, updateContactMutation])

  const handleViewInbox = useCallback(() => {
    if (contactDetailQuery.data?.data) {
      setCurrentPage('inbox')
      // The contact might have conversations; for now navigate to inbox
    }
    setSheetOpen(false)
  }, [contactDetailQuery.data?.data, setCurrentPage])

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor)
    }
  }, [nextCursor])

  const contactDetail = contactDetailQuery.data?.data ?? null
  const analytics = analyticsQuery.data?.data ?? null

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-display">Contacts & Leads</h1>
          <p className="text-muted-foreground">
            {analytics ? `${analytics.totalContacts} leads` : 'Manage leads and contact database'}
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setAddContactOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Summary Cards */}
      {analyticsQuery.isLoading ? (
        <SummaryCardsSkeleton />
      ) : analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.totalContacts}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Total Leads</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-red-100 dark:bg-red-950 p-2">
                  <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.hotLeads}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Hot Leads</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2">
                  <Thermometer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.warmLeads}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Warm Leads</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.convertedLeads}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Converted</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Lead Score Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lead Score Distribution Chart (60%) */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Lead Score Distribution</h3>
              {(() => {
                const raw = analyticsQuery.data as Record<string, unknown> | undefined
                const dist = raw?.leadScoreDistribution as { score: string; count: number }[] | undefined
                const total = dist?.reduce((s, d) => s + d.count, 0) ?? 0
                return total > 0 ? (
                  <span className="text-xs text-muted-foreground">{total} total leads</span>
                ) : null
              })()}
            </div>

            {analyticsQuery.isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Skeleton className="h-[180px] w-full rounded-lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={(() => {
                    const raw = analyticsQuery.data as Record<string, unknown> | undefined
                    const dist = (raw?.leadScoreDistribution as { score: string; count: number }[]) ?? []
                    if (dist.length > 0) {
                      return dist.map((d) => ({
                        bucket: d.score.replace(/-/, '-\n'),
                        label: d.score,
                        count: d.count,
                      }))
                    }
                    return [
                      { bucket: '0-20\nCold', label: 'Cold', count: 3 },
                      { bucket: '21-40\nWarm', label: 'Warm', count: 4 },
                      { bucket: '41-60\nInter-\nested', label: 'Interested', count: 5 },
                      { bucket: '61-80\nHot', label: 'Hot', count: 3 },
                      { bucket: '81-100\nHot Lead', label: 'Hot Lead', count: 3 },
                    ]
                  })()}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="emeraldBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    labelStyle={{ fontWeight: 600 }}
                    formatter={(value: number) => [`${value} leads`, 'Count']}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    fill="url(#emeraldBarGradient)"
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Panel (40%) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-4">
              {/* Average Score */}
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <svg width={44} height={44} className="-rotate-90">
                    <circle cx={22} cy={22} r={18} fill="none" strokeWidth={4} className="stroke-muted" />
                    <circle
                      cx={22} cy={22} r={18} fill="none" strokeWidth={4} strokeLinecap="round"
                      strokeDasharray={113.1} strokeDashoffset={113.1 - (113.1 * 52) / 100}
                      className="stroke-emerald-500"
                      style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                    />
                    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
                      className="fill-foreground text-[11px] font-bold" transform="rotate(90, 22, 22)">
                      52
                    </text>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Average Score</p>
                  <p className="text-sm font-bold text-foreground">52 / 100</p>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +4
                </span>
              </div>

              <div className="border-t border-border" />

              {/* Highest Score */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2 shrink-0">
                  <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Highest Score</p>
                  <p className="text-sm font-bold text-foreground">95 — Fatima Al Maktoum</p>
                </div>
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <Zap className="h-3 w-3" /> Top
                </span>
              </div>

              <div className="border-t border-border" />

              {/* Conversion Rate */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2 shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Conversion Rate</p>
                  <p className="text-sm font-bold text-foreground">16.7%</p>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +2.3%
                </span>
              </div>

              <div className="border-t border-border" />

              {/* Avg Response Time */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2 shrink-0">
                  <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Avg Response Time</p>
                  <p className="text-sm font-bold text-foreground">2.3 min</p>
                </div>
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> -0.5m
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Presets */}
      <div className="flex flex-wrap gap-2">
        {CONTACT_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md preset-glow'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {preset.icon}
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Quick Actions Panel */}
      <QuickActionsPanel
        selectedCount={0}
        onFilterChange={(filterId) => {
          // Map quick action filter IDs to preset IDs where applicable
          const filterMap: Record<string, string> = {
            'vip': 'all', 'new-week': 'new', 'arabic': 'arabic',
          }
          const presetId = filterMap[filterId]
          if (presetId) applyPreset(presetId)
        }}
        onBatchAction={(actionId) => {
          // Placeholder for batch action handlers
        }}
      />

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCursor(null); clearActivePreset() }}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={leadStatus} onValueChange={(v) => { setLeadStatus(v); setCursor(null); clearActivePreset() }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Lead Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={intent} onValueChange={(v) => { setIntent(v); setCursor(null); clearActivePreset() }}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intent</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="invest">Invest</SelectItem>
                  <SelectItem value="browse">Browse</SelectItem>
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={(v) => { setLanguage(v); setCursor(null); clearActivePreset() }}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block table-modern">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Lang</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsQuery.isLoading && cursor === null ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <TableSkeleton />
                    </TableCell>
                  </TableRow>
                ) : allContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <EmptyContacts onClear={clearFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  allContacts.map((contact) => {
                    const displayName = contact.pushName || contact.name || formatPhone(contact.phone)
                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="pl-4">
                          <ContactQuickView contactId={contact.id}>
                            <div className="flex items-center gap-3">
                              <Avatar className={`h-8 w-8 ${getLeadStatusAvatarBorder(contact.leadStatus)}`}>
                                <AvatarFallback className={`${getAvatarColor(contact.id)} text-xs font-semibold`}>
                                  {getInitials(displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[160px] hover-underline-slide">{contact.name || displayName}</p>
                                {contact.pushName && contact.name && contact.pushName !== contact.name && (
                                  <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">aka {contact.pushName}</p>
                                )}
                              </div>
                            </div>
                          </ContactQuickView>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatPhone(contact.phone)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tag-pill ${getLeadScoreBadgeColor(contact.leadScore)}`}>
                            {contact.leadScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize tag-glow ${getLeadStatusColor(contact.leadStatus)}`}>
                            {contact.leadStatus || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.intent ? (
                            <Badge variant="secondary" className="text-xs capitalize tag-outline">{contact.intent}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {contact.areaInterest || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{formatAED(contact.budget)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {contact.language === 'ar' ? '🇦🇪 AR' : '🇬🇧 EN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contact.lastMessageAt ? formatTimeAgo(contact.lastMessageAt) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewContact(contact)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3">
            {contactsQuery.isLoading && cursor === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : allContacts.length === 0 ? (
              <EmptyContacts onClear={clearFilters} />
            ) : (
              allContacts.map((contact) => {
                const displayName = contact.pushName || contact.name || formatPhone(contact.phone)
                return (
                  <ContactQuickView key={contact.id} contactId={contact.id}>
                    <button
                      onClick={() => handleViewContact(contact)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                    >
                      <Avatar className={`h-10 w-10 ${getLeadStatusAvatarBorder(contact.leadStatus)}`}>
                        <AvatarFallback className={`${getAvatarColor(contact.id)} text-sm font-semibold`}>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name || displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatPhone(contact.phone)}</span>
                        <Badge variant="outline" className={`text-[10px] capitalize h-4 ${getLeadStatusColor(contact.leadStatus)}`}>
                          {contact.leadStatus || 'new'}
                        </Badge>
                      </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tag-pill ${getLeadScoreBadgeColor(contact.leadScore)}`}>
                          {contact.leadScore}
                        </span>
                      </div>
                    </button>
                  </ContactQuickView>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {allContacts.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {allContacts.length} of {total}
              </span>
              {nextCursor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={contactsQuery.isLoading}
                >
                  {contactsQuery.isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
              {!nextCursor && allContacts.length > 0 && (
                <span className="text-xs text-muted-foreground">End of results</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Contact Dialog ───────────────────────────────────────────── */}
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Contact Detail Sheet                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedContactId(null) }}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Contact Details</SheetTitle>
            <SheetDescription>View and manage contact information</SheetDescription>
          </SheetHeader>

          {contactDetailQuery.isLoading ? (
            <div className="space-y-4 px-4 pt-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ) : contactDetail ? (
            <div className="space-y-6 px-4 pt-2 pb-6">
              {/* Contact Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className={`${getAvatarColor(contactDetail.id)} text-lg font-bold`}>
                    {getInitials(contactDetail.pushName || contactDetail.name || formatPhone(contactDetail.phone))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {contactDetail.name || contactDetail.pushName || 'Unknown'}
                  </h2>
                  {contactDetail.pushName && contactDetail.name && contactDetail.pushName !== contactDetail.name && (
                    <p className="text-sm text-muted-foreground">aka {contactDetail.pushName}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(contactDetail.phone)}
                  </div>
                  {contactDetail.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                      <Mail className="h-3.5 w-3.5" />
                      {contactDetail.email}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Lead Score */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Lead Score</span>
                  <LeadScoreCircle score={contactDetail.leadScore} />
                </div>
                <div className="flex-1 space-y-3">
                  {/* Lead Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Lead Status</span>
                    {editingStatus ? (
                      <Select value={newStatus} onValueChange={(v) => { setNewStatus(v); handleStatusChange(v) }}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        onClick={() => setEditingStatus(true)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="outline" className={`text-xs capitalize cursor-pointer ${getLeadStatusColor(contactDetail.leadStatus)}`}>
                          {contactDetail.leadStatus || 'new'}
                        </Badge>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Language</span>
                    <Badge variant="outline" className="text-xs">
                      {contactDetail.language === 'ar' ? '🇦🇪 Arabic' : '🇬🇧 English'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Memory */}
              {contactDetail.memory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Contact Memory
                  </h4>
                  <div className="space-y-2">
                    {contactDetail.memory.map((mem) => {
                      const field = memoryLabels[mem.key]
                      return (
                        <div key={mem.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                          <div className="mt-0.5 text-muted-foreground shrink-0">
                            {field?.icon || <Sparkles className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {field?.label || mem.key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm font-medium text-foreground truncate">
                              {mem.value}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <Separator />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Conversations</span>
                  </div>
                  <p className="text-lg font-bold">{contactDetail.conversationCount || 0}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Last Message</span>
                  </div>
                  <p className="text-sm font-medium">
                    {contactDetail.lastMessageAt ? formatTimeAgo(contactDetail.lastMessageAt) : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Intent</span>
                  </div>
                  <p className="text-sm font-medium capitalize">{contactDetail.intent || '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Budget</span>
                  </div>
                  <p className="text-sm font-medium">{formatAED(contactDetail.budget)}</p>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleViewInbox}
                >
                  <MessageSquare className="h-4 w-4" />
                  View in Inbox
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setCurrentPage('bookings')
                    setSheetOpen(false)
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Schedule Booking
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Nudge
                </Button>
              </div>

              {/* Created At */}
              <p className="text-xs text-muted-foreground text-center">
                Created {new Date(contactDetail.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No contact selected</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
