'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BarChart3,
  Clock,
  Globe,
  Handshake,
  MessageSquare,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter'
import { ConversationInsights } from '@/components/analytics/ConversationInsights'
import { AnalyticsExport } from '@/components/analytics/AnalyticsExport'
import { AreaDemandChart } from '@/components/analytics/AreaDemandChart'
import { LeadFunnel } from '@/components/analytics/LeadFunnel'
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
  LineChart,
  Line,
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

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
  handoffTimeline: { date: string; rate: number; handoffs: number; conversations: number }[]
  handoffRate: number
  avgResponseTime: number
  responseTimeDistribution: { bucket: string; count: number }[]
  peakHour: number
  languageSplit: { en: number; ar: number }
  propertyMatchRate: number
}

interface TooltipPayloadEntry {
  value: number
  name: string
  color: string
  payload?: { handoffs?: number; conversations?: number }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="chart-tooltip">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

function PercentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0]
  return (
    <div className="chart-tooltip">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold" style={{ color: entry.color }}>
        Handoff Rate: {(entry.value * 100).toFixed(1)}%
      </p>
      <p className="text-xs text-muted-foreground">
        {entry.payload?.handoffs ?? 0} handoffs from {entry.payload?.conversations ?? 0} conversations
      </p>
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      return (await response.json()) as AnalyticsData
    },
  })

  const chartVolume = (analytics?.conversationVolume ?? []).map((entry) => ({
    ...entry,
    date: new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const handoffTrend = (analytics?.handoffTimeline ?? []).map((entry) => ({
    ...entry,
    date: new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const languageTotal = (analytics?.languageSplit.en ?? 0) + (analytics?.languageSplit.ar ?? 0)
  const englishPercent = languageTotal > 0
    ? Math.round(((analytics?.languageSplit.en ?? 0) / languageTotal) * 100)
    : 0
  const arabicPercent = languageTotal > 0 ? 100 - englishPercent : 0
  const resolutionRate = analytics && analytics.conversations.total > 0
    ? (analytics.conversations.resolved / analytics.conversations.total) * 100
    : 0
  const conversionRate = analytics && analytics.contacts.total > 0
    ? (analytics.contacts.converted / analytics.contacts.total) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display">Analytics</h1>
          <p className="text-subtitle">
            Live org-scoped operational metrics for conversations, leads, and bookings.
          </p>
        </div>
        <AnalyticsExport />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            {analytics?.conversations.today ?? 0} conversations today
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Avg response {formatSeconds(analytics?.avgResponseTime ?? 0)}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Handshake className="h-3.5 w-3.5 text-violet-600" />
            {((analytics?.handoffRate ?? 0) * 100).toFixed(1)}% handoff
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            Peak hour {String(analytics?.peakHour ?? 0).padStart(2, '0')}:00
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <SummaryCardSkeleton key={index} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={analytics?.conversations.total ?? 0} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analytics?.conversations.thisMonth ?? 0} started this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">AI Resolution</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={resolutionRate} format="percent" decimals={1} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analytics?.conversations.resolved ?? 0} resolved without human control
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatSeconds(analytics?.avgResponseTime ?? 0)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on inbound to outbound message pairs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Handoff Rate</CardTitle>
                <Handshake className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={(analytics?.handoffRate ?? 0) * 100} format="percent" decimals={1} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Human-controlled conversations out of all active threads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Property Match</CardTitle>
                <Target className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={(analytics?.propertyMatchRate ?? 0) * 100} format="percent" decimals={1} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contacts with captured area-interest signals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Contact Conversion</CardTitle>
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={conversionRate} format="percent" decimals={1} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analytics?.contacts.converted ?? 0} converted contacts
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Conversation Volume</CardTitle>
              <CardDescription>Daily conversation counts over the live reporting window.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartVolume}>
                  <defs>
                    <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Conversations"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#analyticsAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lead Score Distribution</CardTitle>
              <CardDescription>Contacts grouped by lead score buckets.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics?.leadScoreDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Contacts" radius={[6, 6, 0, 0]}>
                    {(analytics?.leadScoreDistribution ?? []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Intent Breakdown</CardTitle>
              <CardDescription>Distribution of detected contact intent values.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics?.intentBreakdown ?? []}
                    dataKey="count"
                    nameKey="intent"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {(analytics?.intentBreakdown ?? []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Handoff Trend</CardTitle>
              <CardDescription>Daily handoff rate based on live handoff events and conversation counts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={handoffTrend}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip content={<PercentTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Handoff Rate"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AreaDemandChart data={analytics?.areaDemand ?? []} loading={isLoading} />

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>Conversation response pairs grouped by actual latency buckets.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={analytics?.responseTimeDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Conversations" radius={[6, 6, 0, 0]}>
                    {(analytics?.responseTimeDistribution ?? []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <ConversationInsights />

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language Split
              </CardTitle>
              <CardDescription>English versus Arabic contact preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>English</span>
                  <span>{englishPercent}%</span>
                </div>
                <Progress value={englishPercent} className="h-3" />
                <p className="mt-1 text-xs text-muted-foreground">{analytics?.languageSplit.en ?? 0} contacts</p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Arabic</span>
                  <span>{arabicPercent}%</span>
                </div>
                <Progress value={arabicPercent} className="h-3" />
                <p className="mt-1 text-xs text-muted-foreground">{analytics?.languageSplit.ar ?? 0} contacts</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <LeadFunnel
            loading
            contactTotal={0}
            qualifiedLeadCount={0}
            matchedLeadCount={0}
            bookingCount={0}
            convertedCount={0}
          />
        ) : (
          <LeadFunnel
            contactTotal={analytics?.contacts.total ?? 0}
            qualifiedLeadCount={(analytics?.contacts.warm ?? 0) + (analytics?.contacts.hot ?? 0)}
            matchedLeadCount={Math.round((analytics?.contacts.total ?? 0) * (analytics?.propertyMatchRate ?? 0))}
            bookingCount={analytics?.bookings.scheduled ?? 0}
            convertedCount={analytics?.contacts.converted ?? 0}
          />
        )}
      </div>
    </div>
  )
}
