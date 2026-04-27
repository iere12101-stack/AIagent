import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

interface TeamMemberRow {
  id: string
  name: string
  role: string
  whatsapp: string
  email: string
  area_speciality: string[] | null
  speciality_areas: string[] | null
  active: boolean
  created_at: string
  updated_at: string
}

interface ConversationRow {
  id: string
  contact_id: string
  assigned_to: string | null
  lead_score: number
  status: string
  created_at: string
  last_message_at: string | null
}

interface ContactRow {
  id: string
  assigned_to: string | null
  lead_score: number
}

interface BookingRow {
  id: string
  contact_id: string
  conversation_id: string | null
  status: string
  scheduled_date: string
}

interface HandoffRow {
  id: string
  assigned_to: string | null
  status: string
  created_at: string
}

interface MessageRow {
  conversation_id: string
  direction: 'inbound' | 'outbound'
  created_at: string
}

function dateKey(value: string): string {
  return value.split('T')[0]
}

function formatAreaList(areaSpeciality: string[] | null, specialityAreas: string[] | null): string {
  const areas = areaSpeciality?.length ? areaSpeciality : specialityAreas ?? []
  return JSON.stringify(areas)
}

function computeConversationResponseAverages(messages: MessageRow[]): Map<string, number> {
  const sorted = [...messages].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )

  const pendingInbound = new Map<string, string>()
  const conversationDiffs = new Map<string, number[]>()

  for (const message of sorted) {
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
      const values = conversationDiffs.get(message.conversation_id) ?? []
      values.push(diffMs / 1000)
      conversationDiffs.set(message.conversation_id, values)
    }
    pendingInbound.delete(message.conversation_id)
  }

  const averages = new Map<string, number>()
  for (const [conversationId, values] of conversationDiffs.entries()) {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    averages.set(conversationId, Math.round(average))
  }

  return averages
}

function buildRecentDates(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - index)
    dates.push(date.toISOString().split('T')[0])
  }

  return dates
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

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    const [
      { data: membersData, error: membersError },
      { data: conversationsData, error: conversationsError },
      { data: contactsData, error: contactsError },
      { data: bookingsData, error: bookingsError },
      { data: handoffsData, error: handoffsError },
      { data: messagesData, error: messagesError },
    ] = await Promise.all([
      supabase
        .from('team_members')
        .select('id, name, role, whatsapp, email, area_speciality, speciality_areas, active, created_at, updated_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: true }),
      supabase
        .from('conversations')
        .select('id, contact_id, assigned_to, lead_score, status, created_at, last_message_at')
        .eq('org_id', auth.orgId),
      supabase
        .from('contacts')
        .select('id, assigned_to, lead_score')
        .eq('org_id', auth.orgId),
      supabase
        .from('bookings')
        .select('id, contact_id, conversation_id, status, scheduled_date')
        .eq('org_id', auth.orgId),
      supabase
        .from('handoff_events')
        .select('id, assigned_to, status, created_at')
        .eq('org_id', auth.orgId)
        .gte('created_at', thirtyDaysAgoISO),
      supabase
        .from('messages')
        .select('conversation_id, direction, created_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: true }),
    ])

    const firstError = membersError ?? conversationsError ?? contactsError ?? bookingsError ?? handoffsError ?? messagesError
    if (firstError) {
      return NextResponse.json(
        { error: 'Failed to fetch team performance data', details: firstError.message },
        { status: 500 },
      )
    }

    const members = (membersData ?? []) as TeamMemberRow[]
    const conversations = (conversationsData ?? []) as ConversationRow[]
    const contacts = (contactsData ?? []) as ContactRow[]
    const bookings = (bookingsData ?? []) as BookingRow[]
    const handoffs = (handoffsData ?? []) as HandoffRow[]
    const messages = (messagesData ?? []) as MessageRow[]

    const responseAveragesByConversation = computeConversationResponseAverages(messages)
    const conversationsByAssignee = new Map<string, ConversationRow[]>()
    const contactsByAssignee = new Map<string, ContactRow[]>()
    const bookingsByMember = new Map<string, BookingRow[]>()
    const handoffsByMember = new Map<string, HandoffRow[]>()
    const activityByDate = new Map<string, number>()

    for (const conversation of conversations) {
      const activityDate = dateKey(conversation.last_message_at ?? conversation.created_at)
      activityByDate.set(activityDate, (activityByDate.get(activityDate) ?? 0) + 1)

      if (!conversation.assigned_to) {
        continue
      }

      const list = conversationsByAssignee.get(conversation.assigned_to) ?? []
      list.push(conversation)
      conversationsByAssignee.set(conversation.assigned_to, list)
    }

    for (const contact of contacts) {
      if (!contact.assigned_to) {
        continue
      }
      const list = contactsByAssignee.get(contact.assigned_to) ?? []
      list.push(contact)
      contactsByAssignee.set(contact.assigned_to, list)
    }

    const conversationAssigneeMap = new Map<string, string>()
    const contactAssigneeMap = new Map<string, string>()

    for (const conversation of conversations) {
      if (conversation.assigned_to) {
        conversationAssigneeMap.set(conversation.id, conversation.assigned_to)
      }
    }

    for (const contact of contacts) {
      if (contact.assigned_to) {
        contactAssigneeMap.set(contact.id, contact.assigned_to)
      }
    }

    for (const booking of bookings) {
      const memberId = booking.conversation_id
        ? conversationAssigneeMap.get(booking.conversation_id)
        : contactAssigneeMap.get(booking.contact_id)

      if (!memberId) {
        continue
      }

      const list = bookingsByMember.get(memberId) ?? []
      list.push(booking)
      bookingsByMember.set(memberId, list)
    }

    for (const handoff of handoffs) {
      if (!handoff.assigned_to) {
        continue
      }

      const list = handoffsByMember.get(handoff.assigned_to) ?? []
      list.push(handoff)
      handoffsByMember.set(handoff.assigned_to, list)
    }

    const memberPerformance = members.map((member) => {
      const memberConversations = conversationsByAssignee.get(member.id) ?? []
      const memberContacts = contactsByAssignee.get(member.id) ?? []
      const memberBookings = bookingsByMember.get(member.id) ?? []
      const memberHandoffs = handoffsByMember.get(member.id) ?? []
      const completedBookings = memberBookings.filter((booking) =>
        ['confirmed', 'completed'].includes(booking.status),
      )

      const responseTimes = memberConversations
        .map((conversation) => responseAveragesByConversation.get(conversation.id))
        .filter((value): value is number => typeof value === 'number')

      const averageResponseTimeSeconds = responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : 0

      const averageLeadScore = memberContacts.length
        ? Math.round(
            memberContacts.reduce((sum, contact) => sum + (contact.lead_score ?? 0), 0) / memberContacts.length,
          )
        : memberConversations.length
          ? Math.round(
              memberConversations.reduce((sum, conversation) => sum + (conversation.lead_score ?? 0), 0) / memberConversations.length,
            )
          : 0

      const lastActivityCandidates = [
        ...memberConversations.map((conversation) => conversation.last_message_at ?? conversation.created_at),
        ...memberBookings.map((booking) => booking.scheduled_date),
        ...memberHandoffs.map((handoff) => handoff.created_at),
      ].filter((value): value is string => Boolean(value))

      const lastActivityAt = lastActivityCandidates.sort().at(-1) ?? member.updated_at
      const dailyConversationsMap = new Map<string, number>()
      for (const conversation of memberConversations) {
        const key = dateKey(conversation.last_message_at ?? conversation.created_at)
        dailyConversationsMap.set(key, (dailyConversationsMap.get(key) ?? 0) + 1)
      }

      const dailyConversations = buildRecentDates(7).map((date) => ({
        date,
        count: dailyConversationsMap.get(date) ?? 0,
      }))

      return {
        member: {
          id: member.id,
          name: member.name,
          role: member.role,
          whatsapp: member.whatsapp,
          email: member.email,
          phone: member.whatsapp,
          active: member.active,
          createdAt: member.created_at,
          updatedAt: member.updated_at,
          specialityAreas: formatAreaList(member.area_speciality, member.speciality_areas),
          areaSpeciality: member.area_speciality ?? member.speciality_areas ?? [],
        },
        conversations: memberConversations.length,
        averageResponseTimeSeconds,
        conversions: completedBookings.length,
        conversionRate: memberConversations.length
          ? Number((completedBookings.length / memberConversations.length).toFixed(4))
          : 0,
        averageLeadScore,
        activeContacts: memberContacts.length,
        handoffs: memberHandoffs.length,
        lastActivityAt,
        dailyConversations,
      }
    })

    const totalConversations = memberPerformance.reduce((sum, item) => sum + item.conversations, 0)
    const totalConversions = memberPerformance.reduce((sum, item) => sum + item.conversions, 0)
    const activeAgents = memberPerformance.filter((item) => item.member.active).length
    const averageResponseTimeSeconds = memberPerformance.length
      ? Math.round(
          memberPerformance.reduce((sum, item) => sum + item.averageResponseTimeSeconds, 0) /
            memberPerformance.length,
        )
      : 0
    const averageConversionRate = memberPerformance.length
      ? Number(
          (
            memberPerformance.reduce((sum, item) => sum + item.conversionRate, 0) / memberPerformance.length
          ).toFixed(4),
        )
      : 0

    const weekdayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekdayCounts = new Map<string, number>(weekdayOrder.map((day) => [day, 0]))

    for (const [date, count] of activityByDate.entries()) {
      const label = weekdayOrder[new Date(`${date}T00:00:00`).getDay()]
      weekdayCounts.set(label, (weekdayCounts.get(label) ?? 0) + count)
    }

    const weekdayActivity = weekdayOrder.map((day) => ({
      day,
      conversations: weekdayCounts.get(day) ?? 0,
    }))

    return NextResponse.json({
      data: {
        summary: {
          totalMembers: memberPerformance.length,
          activeAgents,
          totalConversations,
          totalConversions,
          averageResponseTimeSeconds,
          averageConversionRate,
        },
        members: memberPerformance.sort((left, right) => {
          if (right.conversionRate !== left.conversionRate) {
            return right.conversionRate - left.conversionRate
          }
          return right.conversations - left.conversations
        }),
        weekdayActivity,
      },
    })
  } catch (error) {
    console.error('GET /api/team/performance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team performance data', details: String(error) },
      { status: 500 },
    )
  }
}
