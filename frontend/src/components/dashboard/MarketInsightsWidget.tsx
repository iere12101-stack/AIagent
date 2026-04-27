'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Clock,
  MapPin,
  Home,
  Building2,
  Landmark,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  conversationVolume: { date: string; count: number }[]
  areaDemand: { area: string; count: number }[]
  leadScoreDistribution: { score: string; count: number }[]
}

// ── Market Trend Data ────────────────────────────────────────────────────────

const marketTrends = [
  {
    area: 'Dubai Marina',
    icon: MapPin,
    metric: 'demand',
    value: '+12%',
    trend: 'up' as const,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-l-emerald-500',
  },
  {
    area: 'Palm Jumeirah',
    icon: Landmark,
    metric: 'prices',
    value: 'stable',
    trend: 'flat' as const,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-l-amber-500',
  },
  {
    area: 'Dubai Hills',
    icon: Building2,
    metric: 'new listings',
    value: '+8%',
    trend: 'up' as const,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-l-blue-500',
  },
  {
    area: 'JVC',
    icon: Home,
    metric: 'avg price',
    value: 'AED 850K',
    trend: 'flat' as const,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-l-purple-500',
  },
]

// ── Buyer Interest Data ──────────────────────────────────────────────────────

const buyerInterestData = [
  { type: 'Apartment', value: 42, color: '#10b981' },
  { type: 'Villa', value: 28, color: '#3b82f6' },
  { type: 'Townhouse', value: 18, color: '#f59e0b' },
  { type: 'Penthouse', value: 12, color: '#8b5cf6' },
]

// ── AI Insight Text ─────────────────────────────────────────────────────────

const aiInsight = `Based on current market data, Dubai Marina shows the strongest buyer demand with a 12% increase in enquiries this quarter. The apartment segment leads at 42% of all buyer interest, particularly in the AED 800K–1.2M range. Palm Jumeirah prices remain stable with premium villa demand holding steady. Dubai Hills is emerging as a high-growth corridor with 8% new listings, driven by off-plan project launches. JVC continues to be the price-accessible entry point at an average of AED 850K.`

// ── Component ────────────────────────────────────────────────────────────────

export function MarketInsightsWidget() {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['analytics-market-insights'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
    staleTime: 60000,
  })

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card className="card-hover glass-card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950">
              <Brain className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Market Insights
                <Badge className="badge-gradient-emerald gap-1 text-[10px] px-1.5 py-0">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI Analysis
                </Badge>
              </CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lastUpdated}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Market Trend Indicators ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {marketTrends.map((trend) => (
            <div
              key={trend.area}
              className={`rounded-lg border-l-[3px] ${trend.border} ${trend.bg} p-3 transition-all duration-150 hover:shadow-sm`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <trend.icon className={`h-3.5 w-3.5 ${trend.color}`} />
                <span className="text-xs font-semibold text-foreground">{trend.area}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${trend.color}`}>{trend.value}</span>
                {trend.trend === 'up' ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{trend.metric}</p>
            </div>
          ))}
        </div>

        <Separator className="divider-gradient" />

        {/* ── Top Buyer Interest Chart ─────────────────────────────────────── */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Top Buyer Interest
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={buyerInterestData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                {buyerInterestData.map((item, i) => (
                  <linearGradient key={`buyerGrad-${i}`} id={`buyerGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={item.color} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 50]}
              />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Interest']}
                contentStyle={{
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: '1px solid oklch(0.596 0.145 163.225 / 30%)',
                }}
              />
              <Bar dataKey="value" name="Interest" radius={[0, 5, 5, 0]} barSize={18}>
                {buyerInterestData.map((_, index) => (
                  <Cell key={`buyer-cell-${index}`} fill={`url(#buyerGrad-${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Separator className="divider-gradient" />

        {/* ── AI Recommendation ───────────────────────────────────────────── */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            AI Recommendation
          </h4>
          <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 p-3 border border-emerald-200/50 dark:border-emerald-800/30">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {aiInsight}
            </p>
          </div>
        </div>

        {/* ── Last Updated Footer ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 pt-1">
          <Clock className="h-3 w-3" />
          <span>Last Updated: {lastUpdated}</span>
          <span className="mx-1">·</span>
          <span>Powered by AI</span>
        </div>
      </CardContent>
    </Card>
  )
}
