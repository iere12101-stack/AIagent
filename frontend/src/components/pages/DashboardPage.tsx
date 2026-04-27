'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MessageSquare,
  Users,
  Building2,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Inbox,
  BarChart3,
  Clock,
  UserPlus,
  Send,
  Target,
  Languages,
  Sparkles,
  Eye,
  Wifi,
  WifiOff,
  MessageCircle,
  UserCheck,
  Calendar,
  Zap,
  Star,
  Settings2,
  GripVertical,
  RotateCcw,
} from 'lucide-react'
import { useRealtime } from '@/lib/useRealtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { AddPropertyDialog } from '@/components/properties/AddPropertyDialog'
import { ROICalculator } from '@/components/dashboard/ROICalculator'
import { FeaturedProperty } from '@/components/dashboard/FeaturedProperty'
import { MarketInsightsWidget } from '@/components/dashboard/MarketInsightsWidget'
import { PropertyPriceTrends } from '@/components/properties/PropertyPriceTrends'
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(dateStr).toLocaleDateString()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getDubaiTime(): string {
  const now = new Date()
  const dubai = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dubaiDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${dubai.format(now)} GST — ${dubaiDate.format(now)}`
}

// ── Widget Customization ────────────────────────────────────────────────────

interface WidgetConfig {
  id: string
  name: string
  description: string
  visible: boolean
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats-cards', name: 'Stats Cards', description: 'Key performance metrics overview', visible: true },
  { id: 'conversation-volume', name: 'Conversation Volume', description: 'Daily conversations chart', visible: true },
  { id: 'lead-score', name: 'Lead Score Distribution', description: 'Contacts by score bucket', visible: true },
  { id: 'recent-conversations', name: 'Recent Conversations', description: 'Latest 5 WhatsApp conversations', visible: true },
  { id: 'intent-breakdown', name: 'Intent Breakdown', description: 'Contact intents distribution', visible: true },
  { id: 'area-demand', name: 'Area Demand', description: 'Top 10 areas by enquiries', visible: true },
  { id: 'quick-actions', name: 'Quick Actions', description: 'Shortcut buttons for common tasks', visible: true },
  { id: 'live-activity', name: 'Live Activity Feed', description: 'Real-time activity stream', visible: true },
  { id: 'roi-calculator', name: 'ROI Calculator', description: 'Property return on investment tool', visible: true },
  { id: 'featured-property', name: 'Featured Property', description: 'Highlighted property listing', visible: true },
  { id: 'market-insights', name: 'Market Insights', description: 'AI-powered market analysis widget', visible: true },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  totalConversations: number
  totalContacts: number
  totalProperties: number
  bookingsToday: number
  activeConversations: number
  newLeads: number
}

interface AnalyticsData {
  conversations: {
    total: number
    active: number
    resolved: number
    today: number
    thisWeek: number
    thisMonth: number
  }
  contacts: {
    total: number
    new: number
    warm: number
    hot: number
    converted: number
  }
  properties: {
    total: number
    sale: number
    rent: number
    ready: number
    offPlan: number
  }
  bookings: {
    total: number
    scheduled: number
    completed: number
    thisWeek: number
  }
  nudges: {
    total: number
    pending: number
    sent: number
    conversionRate: number
  }
  leadScoreDistribution: { score: string; count: number }[]
  intentBreakdown: { intent: string; count: number }[]
  areaDemand: { area: string; count: number }[]
  conversationVolume: { date: string; count: number }[]
  handoffRate: number
  avgResponseTime: number
  languageSplit: { en: number; ar: number }
  propertyMatchRate: number
}

interface ConversationItem {
  id: string
  contact: { id: string; name: string; phone: string; pushName: string; leadScore: number; leadStatus: string }
  lastMessagePreview: string | null
  lastMessageAt: string | null
  status: string
  handledBy: string
}

async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const details = await response.text()
    throw new Error(details || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="h-[320px]">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  value: number
  name: string
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setCurrentPage, setSelectedConversation } = useAppStore()
  const [addPropertyOpen, setAddPropertyOpen] = useState(false)
  const [dubaiTime, setDubaiTime] = useState(getDubaiTime())
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const realtime = useRealtime()

  // Helper to check widget visibility
  const isWidgetVisible = useCallback((id: string) => {
    return widgets.find((w) => w.id === id)?.visible ?? true
  }, [widgets])

  // Toggle widget visibility
  const handleToggleWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, visible: !w.visible } : w))
  }, [])

  // Reset widgets to default
  const handleResetWidgets = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS)
  }, [])

  // Live clock for Dubai time
  useEffect(() => {
    const interval = setInterval(() => {
      setDubaiTime(getDubaiTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────
  const dashboardQuery = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard'],
    queryFn: () => fetchJsonOrThrow<{ data: DashboardData }>('/api/dashboard'),
    retry: 1,
  })

  const analyticsQuery = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => fetchJsonOrThrow<AnalyticsData>('/api/analytics'),
    retry: 1,
  })

  const conversationsQuery = useQuery<{ data: ConversationItem[]; total: number }>({
    queryKey: ['conversations-recent'],
    queryFn: () => fetchJsonOrThrow<{ data: ConversationItem[]; total: number }>('/api/conversations?limit=5'),
    retry: 1,
  })

  const dashboard = dashboardQuery.data?.data
  const analytics = analyticsQuery.data
  const recentConversations = conversationsQuery.data?.data

  // Live stats values (from WebSocket or API fallback)
  const liveActiveConversations = realtime.stats?.activeConversations ?? analytics?.conversations?.active ?? dashboard?.activeConversations ?? 0
  const liveUnreadMessages = realtime.stats?.unreadMessages ?? 47
  const liveNewLeads = realtime.stats?.newLeads ?? ((analytics?.contacts?.warm ?? 0) + (analytics?.contacts?.hot ?? 0))
  const livePendingBookings = realtime.stats?.pendingBookings ?? analytics?.bookings?.scheduled ?? 0

  const leadScoreColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e']

  // Merge realtime activities — empty state when no realtime data
  const activityItems = useMemo(() => {
    if (realtime.activities.length > 0) {
      // Map realtime emoji activities to icon component + bg class
      const emojiToIcon: Record<string, { icon: typeof MessageSquare; bg: string }> = {
        '💬': { icon: MessageSquare, bg: 'bg-blue-100 dark:bg-blue-950' },
        '👨‍💼': { icon: UserPlus, bg: 'bg-emerald-100 dark:bg-emerald-950' },
        '🎯': { icon: Target, bg: 'bg-red-100 dark:bg-red-950' },
        '📅': { icon: Calendar, bg: 'bg-purple-100 dark:bg-purple-950' },
        '🤝': { icon: UserCheck, bg: 'bg-amber-100 dark:bg-amber-950' },
        '🔔': { icon: Zap, bg: 'bg-orange-100 dark:bg-orange-950' },
        '🌍': { icon: Languages, bg: 'bg-cyan-100 dark:bg-cyan-950' },
        '✨': { icon: Sparkles, bg: 'bg-emerald-100 dark:bg-emerald-950' },
        '👁️': { icon: Eye, bg: 'bg-indigo-100 dark:bg-indigo-950' },
        '📊': { icon: BarChart3, bg: 'bg-violet-100 dark:bg-violet-950' },
        '🏠': { icon: Building2, bg: 'bg-emerald-100 dark:bg-emerald-950' },
        '📱': { icon: MessageCircle, bg: 'bg-teal-100 dark:bg-teal-950' },
        '⭐': { icon: Star, bg: 'bg-yellow-100 dark:bg-yellow-950' },
        '📈': { icon: TrendingUp, bg: 'bg-green-100 dark:bg-green-950' },
        '🔄': { icon: RefreshCw, bg: 'bg-blue-100 dark:bg-blue-950' },
        '📋': { icon: Send, bg: 'bg-slate-100 dark:bg-slate-800' },
        '💰': { icon: Users, bg: 'bg-emerald-100 dark:bg-emerald-950' },
        '🚀': { icon: Zap, bg: 'bg-emerald-100 dark:bg-emerald-950' },
        '🏷️': { icon: Target, bg: 'bg-purple-100 dark:bg-purple-950' },
        '📉': { icon: TrendingDown, bg: 'bg-amber-100 dark:bg-amber-950' },
      }
      return realtime.activities.slice(0, 10).map((a) => {
        const mapped = emojiToIcon[a.icon] || { icon: MessageCircle, bg: 'bg-gray-100 dark:bg-gray-800' }
        return {
          icon: mapped.icon,
          color: '',
          bg: a.color || mapped.bg,
          text: a.text,
          time: a.time,
          isRealtime: true,
        }
      })
    }
    return []
  }, [realtime.activities])

  // Format conversation volume dates for display
  const chartVolume = (analytics?.conversationVolume ?? []).map((d) => ({
    ...d,
    date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    dashboardQuery.refetch()
    analyticsQuery.refetch()
    conversationsQuery.refetch()
  }

  const handleConversationClick = (convo: ConversationItem) => {
    setSelectedConversation(convo.id)
    setCurrentPage('inbox')
  }

  // ── Stat card border colors ──────────────────────────────────────────────
  const statBorders = [
    'border-l-4 border-l-emerald-500',
    'border-l-4 border-l-amber-500',
    'border-l-4 border-l-blue-500',
    'border-l-4 border-l-purple-500',
  ]

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header with subtle gradient ────────────────────────────────── */}
      <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 py-6 pb-8 bg-gradient-to-b from-emerald-50/80 via-emerald-50/30 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-display">Dashboard</h1>
            <p className="text-muted-foreground text-subtitle">Welcome back! Here&apos;s an overview of your AI chatbot performance.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={`gap-1.5 ${realtime.isConnected ? 'border-emerald-200 dark:border-emerald-800' : ''}`}>
              {realtime.isConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 status-online">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <Badge variant="default" className="badge-gradient-emerald gap-1 text-xs px-2">
                    <Wifi className="h-3 w-3" />Live
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Offline</span>
                </>
              )}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={dashboardQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${dashboardQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Customize
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Cards Row ───────────────────────────────────────────────── */}
      <div className={`widget-section ${isWidgetVisible('stats-cards') ? '' : 'widget-hidden'}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {/* Total Conversations */}
            <Card className={statBorders[0] + ' card-hover hover-lift'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground stat-label">Total Conversations</CardTitle>
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-500 ease-out stat-value">
                  <AnimatedCounter value={dashboard?.totalConversations ?? 0} prefix="+" />
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{liveActiveConversations} active now</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Leads */}
            <Card className={statBorders[1] + ' card-hover hover-lift'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground stat-label">Active Leads</CardTitle>
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-500 ease-out stat-value">
                  <AnimatedCounter value={liveNewLeads} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <span>{liveUnreadMessages} unread messages</span>
                </div>
              </CardContent>
            </Card>

            {/* Properties Listed */}
            <Card className={statBorders[2] + ' card-hover hover-lift'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground stat-label">Properties Listed</CardTitle>
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-500 ease-out stat-value">
                  <AnimatedCounter value={dashboard?.totalProperties ?? 0} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <span>{(analytics?.properties?.sale ?? 0)} sale · {(analytics?.properties?.rent ?? 0)} rent</span>
                </div>
              </CardContent>
            </Card>

            {/* Bookings This Week */}
            <Card className={statBorders[3] + ' card-hover hover-lift'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground stat-label">Bookings This Week</CardTitle>
                <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-950">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-500 ease-out stat-value">
                  <AnimatedCounter value={analytics?.bookings?.thisWeek ?? 0} prefix="+" />
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{livePendingBookings} pending</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      </div>

      {/* ── Featured Property + ROI Calculator ──────────────────────────── */}
      {(isWidgetVisible('featured-property') || isWidgetVisible('roi-calculator')) && (
      <div className={`widget-section`}>
      <div className="grid gap-4 md:grid-cols-2">
        {isWidgetVisible('featured-property') && <FeaturedProperty />}
        {isWidgetVisible('roi-calculator') && <ROICalculator />}
      </div>
      </div>
      )}

      {/* ── Charts Row 1: Volume + Lead Score ─────────────────────────────── */}
      {(isWidgetVisible('conversation-volume') || isWidgetVisible('lead-score')) && (
      <div className="grid gap-4 md:grid-cols-3">
        {/* Conversation Volume — wider left */}
        <div className={`md:col-span-2 ${isWidgetVisible('conversation-volume') ? '' : 'hidden'}`}>
        {analyticsQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="card-hover hover-lift">
            <CardHeader>
              <CardTitle>Conversation Volume</CardTitle>
              <CardDescription>Daily conversations over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartVolume} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="50%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="dashAreaStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickFormatter={(v: string) => v.split(' ')[0]}
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Conversations"
                    stroke="url(#dashAreaStroke)"
                    strokeWidth={2.5}
                    fill="url(#dashAreaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Lead Score Distribution — narrower right */}
        <div className={`md:col-span-1 ${isWidgetVisible('lead-score') ? '' : 'hidden'}`}>
        {analyticsQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="card-hover hover-lift">
            <CardHeader>
              <CardTitle>Lead Score Distribution</CardTitle>
              <CardDescription>Contacts by score bucket</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics?.leadScoreDistribution ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {leadScoreColors.map((color, i) => (
                      <linearGradient key={`barGrad-${i}`} id={`dashBarGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="score" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Contacts" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {(analytics?.leadScoreDistribution ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#dashBarGrad-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      )}

      {/* ── Property Price Trends ──────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <PropertyPriceTrends />
      </div>

      {/* ── Charts Row 2: Recent Conversations + Intent + Area ────────────── */}
      {(isWidgetVisible('recent-conversations') || isWidgetVisible('intent-breakdown') || isWidgetVisible('area-demand')) && (
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Conversations */}
        <div className={isWidgetVisible('recent-conversations') ? '' : 'hidden'}>
        <Card className="card-hover hover-lift">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Latest 5 WhatsApp conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {conversationsQuery.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : recentConversations && recentConversations.length > 0 ? (
              <div className="space-y-3">
                {recentConversations.map((convo) => (
                  <div
                    key={convo.id}
                    className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleConversationClick(convo)}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium">
                        {getInitials(convo.contact.name || convo.contact.pushName || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {convo.contact.pushName || convo.contact.name || convo.contact.phone}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {convo.lastMessagePreview || 'No message'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {convo.lastMessageAt ? formatTimeAgo(convo.lastMessageAt) : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent conversations</p>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Intent Breakdown (Donut) */}
        <div className={isWidgetVisible('intent-breakdown') ? '' : 'hidden'}>
        {analyticsQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="card-hover hover-lift">
            <CardHeader>
              <CardTitle>Intent Breakdown</CardTitle>
              <CardDescription>Contact intents distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics?.intentBreakdown ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="intent"
                    isAnimationActive
                    animationDuration={800}
                  >
                    {(analytics?.intentBreakdown ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1.5px solid oklch(0.596 0.145 163.225 / 35%)',
                      fontSize: '12px',
                      boxShadow: '0 4px 16px -4px oklch(0 0 0 / 12%)',
                    }}
                    labelStyle={{ fontSize: '11px', fontWeight: 500 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Area Demand (Horizontal Bar) */}
        <div className={isWidgetVisible('area-demand') ? '' : 'hidden'}>
        {analyticsQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="card-hover hover-lift">
            <CardHeader>
              <CardTitle>Area Demand</CardTitle>
              <CardDescription>Top 10 areas by enquiries</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={analytics?.areaDemand ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dashHBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="area"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Enquiries" fill="url(#dashHBarGrad)" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      )}

      {/* ── Market Insights Widget ────────────────────────────────────────── */}
      <div className={`widget-section ${isWidgetVisible('market-insights') ? '' : 'widget-hidden'}`}>
        <MarketInsightsWidget />
      </div>

      {/* ── System Status Widget ────────────────────────────────────────── */}
      {/* ── Quick Actions Row ─────────────────────────────────────────────── */}
      <div className={`widget-section ${isWidgetVisible('quick-actions') ? '' : 'widget-hidden'}`}>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setAddPropertyOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white press-scale">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage('inbox')} className="gap-2 press-scale">
          <Inbox className="h-4 w-4" />
          View Inbox
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage('analytics')} className="gap-2 press-scale">
          <BarChart3 className="h-4 w-4" />
          View Analytics
        </Button>
      </div>
      </div>

      {/* ── Live Activity Feed ────────────────────────────────────────────── */}
      <div className={`widget-section ${isWidgetVisible('live-activity') ? '' : 'widget-hidden'}`}>
      <Card className="card-hover glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                Live Activity
                {realtime.isConnected ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                ) : (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
                  </span>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={realtime.isConnected ? 'default' : 'secondary'} className={`gap-1 text-xs ${realtime.isConnected ? 'bg-emerald-600 text-white' : ''}`}>
                {realtime.isConnected ? (
                  <><Wifi className="h-3 w-3" />Connected</>
                ) : (
                  <><WifiOff className="h-3 w-3" />Disconnected</>
                )}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Dubai, GST
              </Badge>
            </div>
          </div>
          <div className="text-xl font-bold font-mono tracking-wide text-emerald-700 dark:text-emerald-400 mt-1">
            {dubaiTime}
          </div>
        </CardHeader>
        <CardContent>
          {activityItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Activity will appear here when events are received</p>
            </div>
          ) : (
          <div className="space-y-1">
            {activityItems.map((item, i) => (
              <div
                key={item.isRealtime ? `rt-${item.text}-${item.time}` : `activity-${i}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors ${item.isRealtime ? 'animate-fade-in-up' : ''}`}
                style={item.isRealtime ? { animationDelay: '0ms', animationFillMode: 'backwards' } : { animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className={`rounded-full p-1.5 ${item.bg}`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
                <p className="text-sm text-muted-foreground flex-1">{item.text}</p>
                <span className="text-xs text-muted-foreground/70 whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* ── Widget Customization Sheet ─────────────────────────────────── */}
      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Customize Dashboard</SheetTitle>
            <SheetDescription>Toggle widgets on and off to personalize your dashboard view.</SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-1 py-2">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium cursor-pointer">
                      {widget.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {widget.description}
                    </p>
                  </div>
                  <Switch
                    id={`widget-${widget.id}`}
                    checked={widget.visible}
                    onCheckedChange={() => handleToggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWidgets}
              className="gap-2 w-full"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Add Property Dialog ───────────────────────────────────────────── */}
      <AddPropertyDialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen} />
    </div>
  )
}
