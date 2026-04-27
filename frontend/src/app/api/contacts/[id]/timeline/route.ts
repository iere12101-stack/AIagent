import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

type RouteContext = { params: Promise<{ id: string }> }

type TimelineEventType =
  | 'message_sent'
  | 'message_received'
  | 'lead_score'
  | 'booking'
  | 'nudge'
  | 'handoff'
  | 'contact_created'
  | 'ai_response'

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description: string
  timestamp: string
}

function extractRelatedName(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0]
    if (first && typeof first === 'object' && 'name' in first && typeof first.name === 'string') {
      return first.name
    }
    return undefined
  }

  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
    return value.name
  }

  return undefined
}

export async function GET(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const supabase = createServerClient()

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, name, phone, created_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', id)
      .eq('org_id', auth.orgId)

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id)

    const [
      { data: messages },
      { data: leadScores },
      { data: bookings },
      { data: nudges },
      { data: handoffs },
    ] = await Promise.all([
      conversationIds.length > 0
        ? supabase
            .from('messages')
            .select('id, direction, sender_type, content, created_at')
            .in('conversation_id', conversationIds)
            .eq('org_id', auth.orgId)
            .order('created_at', { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      supabase
        .from('lead_scores')
        .select('id, score, created_at')
        .eq('contact_id', id)
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('bookings')
        .select('id, property_ref, status, scheduled_date, created_at')
        .eq('contact_id', id)
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('nudge_jobs')
        .select('id, nudge_type, status, scheduled_at, sent_at, created_at')
        .eq('contact_id', id)
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('handoff_events')
        .select('id, trigger_value, created_at, team_members(name)')
        .eq('contact_id', id)
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    const timeline: TimelineEvent[] = [
      {
        id: `contact-${contact.id}`,
        type: 'contact_created' as const,
        title: 'Contact created',
        description: `${contact.name ?? contact.phone} was added to the system.`,
        timestamp: contact.created_at,
      },
      ...(messages ?? []).map((message) => {
        const type: TimelineEventType =
          message.sender_type === 'ai'
            ? 'ai_response'
            : message.direction === 'inbound'
              ? 'message_received'
              : 'message_sent'

        const event: TimelineEvent = {
          id: `message-${message.id}`,
          type,
          title:
            type === 'ai_response'
              ? 'AI response sent'
              : type === 'message_received'
                ? 'Message received'
                : 'Message sent',
          description: message.content,
          timestamp: message.created_at,
        }
        return event
      }),
      ...(leadScores ?? []).map((score) => ({
        id: `lead-score-${score.id}`,
        type: 'lead_score' as const,
        title: 'Lead score updated',
        description: `Lead score recorded at ${score.score}.`,
        timestamp: score.created_at,
      })),
      ...(bookings ?? []).map((booking) => ({
        id: `booking-${booking.id}`,
        type: 'booking' as const,
        title: 'Booking scheduled',
        description: `${booking.property_ref ? `Viewing for ${booking.property_ref}` : 'Viewing booked'} with status ${booking.status}.`,
        timestamp: booking.scheduled_date ?? booking.created_at,
      })),
      ...(nudges ?? []).map((nudge) => ({
        id: `nudge-${nudge.id}`,
        type: 'nudge' as const,
        title: 'Nudge activity',
        description: `${nudge.nudge_type} nudge is ${nudge.status}.`,
        timestamp: nudge.sent_at ?? nudge.scheduled_at ?? nudge.created_at,
      })),
      ...(handoffs ?? []).map((handoff) => {
        const assignee = extractRelatedName(handoff.team_members)
        return {
          id: `handoff-${handoff.id}`,
          type: 'handoff' as const,
          title: 'Handoff to agent',
          description: assignee
            ? `Transferred to ${assignee}${handoff.trigger_value ? ` - ${handoff.trigger_value}` : ''}.`
            : `Handoff created${handoff.trigger_value ? ` - ${handoff.trigger_value}` : ''}.`,
          timestamp: handoff.created_at,
        }
      }),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 20)

    return NextResponse.json({ data: timeline })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load contact timeline', details: String(error) },
      { status: 500 },
    )
  }
}
