'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Languages,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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
  peakHour: number
}

interface InsightCardData {
  icon: React.ReactNode
  title: string
  value: string
  description: string
}

interface Recommendation {
  id: string
  title: string
  description: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

function computeAverageLeadScore(distribution: { score: string; count: number }[]): number {
  const midpoints: Record<string, number> = {
    '0-20': 10,
    '21-40': 30,
    '41-60': 50,
    '61-80': 70,
    '81-100': 90,
  }

  let totalCount = 0
  let weightedScore = 0

  for (const bucket of distribution) {
    weightedScore += (midpoints[bucket.score] ?? 50) * bucket.count
    totalCount += bucket.count
  }

  return totalCount > 0 ? Math.round(weightedScore / totalCount) : 0
}

function getBusiestDay(volume: { date: string; count: number }[]): { day: string; count: number } {
  const dayCounts = new Map<string, number>()
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const entry of volume) {
    const label = weekdayNames[new Date(`${entry.date}T00:00:00`).getDay()]
    dayCounts.set(label, (dayCounts.get(label) ?? 0) + entry.count)
  }

  let busiest = { day: 'Monday', count: 0 }
  for (const [day, count] of dayCounts.entries()) {
    if (count > busiest.count) {
      busiest = { day, count }
    }
  }

  return busiest
}

function getPriorityBadge(priority: Recommendation['priority']): string {
  if (priority === 'high') {
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
  }
  if (priority === 'medium') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  }
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
}

function InsightCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  )
}

function RecommendationsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

function TopicsSkeleton() {
  const widths = [88, 112, 74, 128, 96, 84, 106, 90]

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {widths.map((width, index) => (
            <Skeleton key={index} className="h-8 rounded-full" style={{ width }} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ConversationInsights() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics-insights'],
    queryFn: async () => {
      const response = await fetch('/api/analytics')
      if (!response.ok) {
        throw new Error('Failed to load analytics insights')
      }
      return (await response.json()) as AnalyticsData
    },
  })

  const insights = useMemo<InsightCardData[]>(() => {
    if (!analytics) {
      return []
    }

    const topIntent = analytics.intentBreakdown[0]?.intent ?? 'No intent yet'
    const busiestDay = getBusiestDay(analytics.conversationVolume)
    const averageLeadScore = computeAverageLeadScore(analytics.leadScoreDistribution)
    const languageTotal = analytics.languageSplit.en + analytics.languageSplit.ar
    const arabicPercent = languageTotal > 0
      ? Math.round((analytics.languageSplit.ar / languageTotal) * 100)
      : 0

    return [
      {
        icon: <Bot className="h-4 w-4 text-emerald-600" />,
        title: 'Resolved By AI',
        value: `${analytics.conversations.total > 0 ? Math.round((analytics.conversations.resolved / analytics.conversations.total) * 100) : 0}%`,
        description: `${analytics.conversations.resolved} conversations resolved without human handoff.`,
      },
      {
        icon: <Target className="h-4 w-4 text-violet-600" />,
        title: 'Top Intent',
        value: topIntent.replace(/^\w/, (char) => char.toUpperCase()),
        description: analytics.intentBreakdown[0]
          ? `${analytics.intentBreakdown[0].count} contacts currently map to this journey.`
          : 'Intent signals will appear as conversations accumulate.',
      },
      {
        icon: <CalendarDays className="h-4 w-4 text-amber-600" />,
        title: 'Busiest Day',
        value: busiestDay.day,
        description: `${busiestDay.count} conversations landed on the busiest weekday in the current window.`,
      },
      {
        icon: <Clock className="h-4 w-4 text-blue-600" />,
        title: 'Peak Hour',
        value: `${analytics.peakHour.toString().padStart(2, '0')}:00`,
        description: 'Based on actual org-scoped message timestamps.',
      },
      {
        icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
        title: 'Avg Lead Score',
        value: `${averageLeadScore}/100`,
        description: 'Weighted from the live lead-score distribution buckets.',
      },
      {
        icon: <Languages className="h-4 w-4 text-cyan-600" />,
        title: 'Arabic Share',
        value: `${arabicPercent}%`,
        description: `${analytics.languageSplit.ar} Arabic contacts versus ${analytics.languageSplit.en} English contacts.`,
      },
    ]
  }, [analytics])

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!analytics) {
      return []
    }

    const items: Recommendation[] = []
    const unresolvedShare = analytics.conversations.total > 0
      ? 1 - analytics.conversations.resolved / analytics.conversations.total
      : 0
    const warmHotLeads = analytics.contacts.warm + analytics.contacts.hot
    const languageTotal = analytics.languageSplit.en + analytics.languageSplit.ar
    const arabicPercent = languageTotal > 0 ? analytics.languageSplit.ar / languageTotal : 0

    if (analytics.handoffRate > 0.25) {
      items.push({
        id: 'handoff',
        priority: 'high',
        title: 'Review escalation triggers',
        description: `${Math.round(analytics.handoffRate * 100)}% of conversations are moving to human agents. Tighten the sentiment rules or improve the fallback prompt.`,
        action: 'Check handoff rules',
      })
    }

    if (analytics.avgResponseTime > 60) {
      items.push({
        id: 'response-time',
        priority: 'high',
        title: 'Reduce response latency',
        description: `Average response time is ${analytics.avgResponseTime}s. Review queue pressure, provider availability, or agent routing delays.`,
        action: 'Inspect queues',
      })
    }

    if (warmHotLeads > analytics.bookings.scheduled) {
      items.push({
        id: 'bookings',
        priority: 'medium',
        title: 'Convert qualified leads into viewings',
        description: `${warmHotLeads} warm or hot leads are in the funnel, but only ${analytics.bookings.scheduled} bookings are scheduled.`,
        action: 'Follow up on leads',
      })
    }

    if (arabicPercent >= 0.25) {
      items.push({
        id: 'arabic',
        priority: 'medium',
        title: 'Double-check Arabic coverage',
        description: `${Math.round(arabicPercent * 100)}% of contacts prefer Arabic. Make sure your Arabic flow and nudge templates stay current.`,
        action: 'Review Arabic flow',
      })
    }

    if (analytics.nudges.pending > analytics.nudges.sent) {
      items.push({
        id: 'nudges',
        priority: 'low',
        title: 'Watch pending nudges',
        description: `${analytics.nudges.pending} nudges are still queued. Confirm they are being cancelled promptly on bookings and human handoffs.`,
        action: 'Open nudge queue',
      })
    }

    if (items.length === 0) {
      items.push({
        id: 'healthy',
        priority: 'low',
        title: 'Keep the current flow stable',
        description: 'Current funnel, language mix, and handoff levels look healthy for this date range.',
        action: 'Review dashboard',
      })
    }

    return items.slice(0, 4)
  }, [analytics])

  const liveTopics = useMemo(() => {
    if (!analytics) {
      return []
    }

    const topics = [
      ...analytics.areaDemand.map((item) => ({
        label: item.area,
        count: item.count,
        type: 'area' as const,
      })),
      ...analytics.intentBreakdown.map((item) => ({
        label: item.intent.replace(/^\w/, (char) => char.toUpperCase()),
        count: item.count,
        type: 'intent' as const,
      })),
    ]

    return topics
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, 12)
  }, [analytics])

  const operationalSignals = useMemo(() => {
    if (!analytics) {
      return { resolved: 0, matched: 0, handoff: 0 }
    }

    const resolved = analytics.conversations.total > 0
      ? Math.round((analytics.conversations.resolved / analytics.conversations.total) * 100)
      : 0
    const matched = Math.round(analytics.propertyMatchRate * 100)
    const handoff = Math.round(analytics.handoffRate * 100)

    return { resolved, matched, handoff }
  }, [analytics])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Conversation Insights</h2>
          <p className="text-sm text-muted-foreground">
            Operational signals derived from live org-scoped analytics.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <InsightCardSkeleton key={index} />)
          : insights.map((insight) => (
              <Card key={insight.title} className="card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {insight.icon}
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{insight.value}</div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{insight.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <RecommendationsSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
                Recommended Actions
              </CardTitle>
              <CardDescription>
                Rules-based suggestions from the current funnel and response metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge className={getPriorityBadge(recommendation.priority)}>
                      {recommendation.priority}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      {recommendation.action}
                    </Button>
                  </div>
                  <p className="text-sm font-medium">{recommendation.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {recommendation.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <TopicsSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-600" />
                Live Topic Signals
              </CardTitle>
              <CardDescription>
                Areas and intent clusters surfaced from actual contact data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {liveTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {liveTopics.map((topic) => {
                    const selected = selectedTopic === topic.label
                    return (
                      <button
                        key={`${topic.type}-${topic.label}`}
                        onClick={() => setSelectedTopic(selected ? null : topic.label)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900'
                        }`}
                      >
                        {topic.label}
                        <span className="ml-1.5 text-[10px] opacity-70">{topic.count}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Topic signals will populate once contacts start sharing area interest and intent.
                </p>
              )}

              {selectedTopic ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Filtering on <strong>{selectedTopic}</strong>.
                  </p>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                  >
                    <X className="h-3 w-3" />
                    Clear topic filter
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full rounded-full" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Funnel Health
            </CardTitle>
            <CardDescription>
              Live ratios for AI resolution, property matches, and human handoffs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    AI resolution rate
                  </span>
                  <span>{operationalSignals.resolved}%</span>
                </div>
                <Progress value={operationalSignals.resolved} className="h-3" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Property match rate
                  </span>
                  <span>{operationalSignals.matched}%</span>
                </div>
                <Progress value={operationalSignals.matched} className="h-3" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-600" />
                    Human handoff rate
                  </span>
                  <span>{operationalSignals.handoff}%</span>
                </div>
                <Progress value={operationalSignals.handoff} className="h-3" />
              </div>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground">
              These signals are calculated from live conversations, contacts, and booking activity instead of synthetic sentiment scores.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
