import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

type SupabaseClient = ReturnType<typeof createServerClient>

interface CountBucket {
  count: number
}

interface MessageRow {
  conversation_id: string
  direction: 'inbound' | 'outbound'
  created_at: string
}

interface TimelinePoint {
  date: string
  count: number
}

interface HandoffTimelinePoint {
  date: string
  rate: number
  handoffs: number
  conversations: number
}

interface ResponseBucket {
  bucket: string
  count: number
}

const RESPONSE_BUCKETS = [
  { key: '<30s', min: 0, max: 30_000 },
  { key: '30s-1m', min: 30_000, max: 60_000 },
  { key: '1-3m', min: 60_000, max: 180_000 },
  { key: '3-5m', min: 180_000, max: 300_000 },
  { key: '5m+', min: 300_000, max: Number.POSITIVE_INFINITY },
] as const

async function countTable(
  supabase: SupabaseClient,
  table: string,
  orgId: string,
  filters: Record<string, string> = {},
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }

  const { count } = await query
  return count ?? 0
}

async function countGte(
  supabase: SupabaseClient,
  table: string,
  orgId: string,
  dateField: string,
  dateValue: string,
  extraFilters: Record<string, string> = {},
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte(dateField, dateValue)

  for (const [key, value] of Object.entries(extraFilters)) {
    query = query.eq(key, value)
  }

  const { count } = await query
  return count ?? 0
}

async function countBetween(
  supabase: SupabaseClient,
  table: string,
  orgId: string,
  field: string,
  gte: number,
  lte: number,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte(field, gte)
    .lte(field, lte)

  return count ?? 0
}

function isoDateKey(value: string): string {
  return value.split('T')[0]
}

function enumerateDays(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function buildConversationVolume(rows: { created_at: string }[], from: Date, to: Date): TimelinePoint[] {
  const map = new Map<string, number>()

  for (const row of rows) {
    const key = isoDateKey(row.created_at)
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return enumerateDays(from, to).map((date) => ({
    date,
    count: map.get(date) ?? 0,
  }))
}

function buildHandoffTimeline(
  conversations: TimelinePoint[],
  rows: { created_at: string }[],
): HandoffTimelinePoint[] {
  const handoffMap = new Map<string, number>()

  for (const row of rows) {
    const key = isoDateKey(row.created_at)
    handoffMap.set(key, (handoffMap.get(key) ?? 0) + 1)
  }

  return conversations.map((point) => {
    const handoffs = handoffMap.get(point.date) ?? 0
    return {
      date: point.date,
      handoffs,
      conversations: point.count,
      rate: point.count > 0 ? Number((handoffs / point.count).toFixed(4)) : 0,
    }
  })
}

function computeResponseMetrics(messages: MessageRow[]): {
  avgResponseTime: number
  responseTimeDistribution: ResponseBucket[]
  peakHour: number
} {
  const sorted = [...messages].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )

  const responseDiffs: number[] = []
  const pendingInbound = new Map<string, string>()
  const hourlyMessageCounts = Array.from({ length: 24 }, () => 0)

  for (const message of sorted) {
    const hour = new Date(message.created_at).getHours()
    hourlyMessageCounts[hour] += 1

    if (message.direction === 'inbound') {
      pendingInbound.set(message.conversation_id, message.created_at)
      continue
    }

    const inboundAt = pendingInbound.get(message.conversation_id)
    if (!inboundAt) {
      continue
    }

    const diffMs = new Date(message.created_at).getTime() - new Date(inboundAt).getTime()
    if (diffMs > 0) {
      responseDiffs.push(diffMs)
    }

    pendingInbound.delete(message.conversation_id)
  }

  const avgResponseTime = responseDiffs.length
    ? Math.round(responseDiffs.reduce((sum, value) => sum + value, 0) / responseDiffs.length / 1000)
    : 0

  const responseTimeDistribution = RESPONSE_BUCKETS.map((bucket) => ({
    bucket: bucket.key,
    count: responseDiffs.filter(
      (value) => value >= bucket.min && value < bucket.max,
    ).length,
  }))

  let peakHour = 0
  let peakVolume = 0

  hourlyMessageCounts.forEach((count, hour) => {
    if (count > peakVolume) {
      peakHour = hour
      peakVolume = count
    }
  })

  return {
    avgResponseTime,
    responseTimeDistribution,
    peakHour,
  }
}

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(startOfToday)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

    const todayISO = startOfToday.toISOString()
    const weekISO = startOfWeek.toISOString()
    const monthISO = startOfMonth.toISOString()
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    const [
      convoTotal,
      convoActive,
      convoResolved,
      convoToday,
      convoThisWeek,
      convoThisMonth,
      contactTotal,
      contactNew,
      contactWarm,
      contactHot,
      contactConverted,
      propTotal,
      propSale,
      propRent,
      propReady,
      propOffPlan,
      bookingTotal,
      bookingScheduled,
      bookingCompleted,
      bookingThisWeek,
      nudgeTotal,
      nudgePending,
      nudgeSent,
      score0to20,
      score21to40,
      score41to60,
      score61to80,
      score81to100,
      convoHumanHandled,
      enCount,
      arCount,
    ] = await Promise.all([
      countTable(supabase, 'conversations', auth.orgId),
      countTable(supabase, 'conversations', auth.orgId, { status: 'active' }),
      countTable(supabase, 'conversations', auth.orgId, { status: 'resolved' }),
      countGte(supabase, 'conversations', auth.orgId, 'created_at', todayISO),
      countGte(supabase, 'conversations', auth.orgId, 'created_at', weekISO),
      countGte(supabase, 'conversations', auth.orgId, 'created_at', monthISO),
      countTable(supabase, 'contacts', auth.orgId),
      countTable(supabase, 'contacts', auth.orgId, { lead_status: 'new' }),
      countTable(supabase, 'contacts', auth.orgId, { lead_status: 'warm' }),
      countTable(supabase, 'contacts', auth.orgId, { lead_status: 'hot' }),
      countTable(supabase, 'contacts', auth.orgId, { lead_status: 'converted' }),
      countTable(supabase, 'properties', auth.orgId),
      countTable(supabase, 'properties', auth.orgId, { category: 'sale' }),
      countTable(supabase, 'properties', auth.orgId, { category: 'rent' }),
      countTable(supabase, 'properties', auth.orgId, { status: 'ready' }),
      countTable(supabase, 'properties', auth.orgId, { status: 'off-plan' }),
      countTable(supabase, 'bookings', auth.orgId),
      countTable(supabase, 'bookings', auth.orgId, { status: 'scheduled' }),
      countTable(supabase, 'bookings', auth.orgId, { status: 'completed' }),
      countGte(supabase, 'bookings', auth.orgId, 'scheduled_date', weekISO),
      countTable(supabase, 'nudge_jobs', auth.orgId),
      countTable(supabase, 'nudge_jobs', auth.orgId, { status: 'pending' }),
      countTable(supabase, 'nudge_jobs', auth.orgId, { status: 'sent' }),
      countBetween(supabase, 'contacts', auth.orgId, 'lead_score', 0, 20),
      countBetween(supabase, 'contacts', auth.orgId, 'lead_score', 21, 40),
      countBetween(supabase, 'contacts', auth.orgId, 'lead_score', 41, 60),
      countBetween(supabase, 'contacts', auth.orgId, 'lead_score', 61, 80),
      countBetween(supabase, 'contacts', auth.orgId, 'lead_score', 81, 100),
      countTable(supabase, 'conversations', auth.orgId, { handled_by: 'human' }),
      countTable(supabase, 'contacts', auth.orgId, { language: 'en' }),
      countTable(supabase, 'contacts', auth.orgId, { language: 'ar' }),
    ])

    const [
      { data: intentContacts },
      { data: areaContacts },
      { data: recentConversations },
      { data: handoffEvents },
      { data: allMessages },
      { count: contactsWithArea },
    ] = await Promise.all([
      supabase
        .from('contacts')
        .select('intent')
        .eq('org_id', auth.orgId)
        .not('intent', 'is', null),
      supabase
        .from('contacts')
        .select('area_interest')
        .eq('org_id', auth.orgId)
        .not('area_interest', 'is', null),
      supabase
        .from('conversations')
        .select('created_at')
        .eq('org_id', auth.orgId)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: true }),
      supabase
        .from('handoff_events')
        .select('created_at')
        .eq('org_id', auth.orgId)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .select('conversation_id, direction, created_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: true }),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .not('area_interest', 'is', null),
    ])

    const leadScoreDistribution = [
      { score: '0-20', count: score0to20 },
      { score: '21-40', count: score21to40 },
      { score: '41-60', count: score41to60 },
      { score: '61-80', count: score61to80 },
      { score: '81-100', count: score81to100 },
    ]

    const intentMap = new Map<string, number>()
    for (const contact of intentContacts ?? []) {
      const key = contact.intent || 'unknown'
      intentMap.set(key, (intentMap.get(key) ?? 0) + 1)
    }
    const intentBreakdown = Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((left, right) => right.count - left.count)

    const areaMap = new Map<string, number>()
    for (const contact of areaContacts ?? []) {
      const key = contact.area_interest || 'unknown'
      areaMap.set(key, (areaMap.get(key) ?? 0) + 1)
    }
    const areaDemand = Array.from(areaMap.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10)

    const conversationVolume = buildConversationVolume(recentConversations ?? [], thirtyDaysAgo, startOfToday)
    const handoffTimeline = buildHandoffTimeline(conversationVolume, handoffEvents ?? [])
    const { avgResponseTime, responseTimeDistribution, peakHour } = computeResponseMetrics(
      (allMessages ?? []) as MessageRow[],
    )

    const handoffRate = convoTotal > 0 ? Number((convoHumanHandled / convoTotal).toFixed(4)) : 0
    const nudgeConversionRate = nudgeSent > 0 ? Number((bookingCompleted / nudgeSent).toFixed(4)) : 0
    const propertyMatchRate = contactTotal > 0
      ? Number((((contactsWithArea as number | null) ?? 0) / contactTotal).toFixed(4))
      : 0

    return NextResponse.json({
      conversations: {
        total: convoTotal,
        active: convoActive,
        resolved: convoResolved,
        today: convoToday,
        thisWeek: convoThisWeek,
        thisMonth: convoThisMonth,
      },
      contacts: {
        total: contactTotal,
        new: contactNew,
        warm: contactWarm,
        hot: contactHot,
        converted: contactConverted,
      },
      properties: {
        total: propTotal,
        sale: propSale,
        rent: propRent,
        ready: propReady,
        offPlan: propOffPlan,
      },
      bookings: {
        total: bookingTotal,
        scheduled: bookingScheduled,
        completed: bookingCompleted,
        thisWeek: bookingThisWeek,
      },
      nudges: {
        total: nudgeTotal,
        pending: nudgePending,
        sent: nudgeSent,
        conversionRate: nudgeConversionRate,
      },
      leadScoreDistribution,
      intentBreakdown,
      areaDemand,
      conversationVolume,
      handoffTimeline,
      handoffRate,
      avgResponseTime,
      responseTimeDistribution,
      peakHour,
      languageSplit: { en: enCount, ar: arCount },
      propertyMatchRate,
    })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: String(error) },
      { status: 500 },
    )
  }
}
