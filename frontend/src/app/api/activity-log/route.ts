import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

type EventType = 'login' | 'property' | 'contact' | 'conversation' | 'booking' | 'settings' | 'system'
type ActionType = 'Created' | 'Updated' | 'Deleted' | 'Viewed' | 'Exported' | 'Login' | 'Sent'

interface ActivityEvent {
  id: string
  eventType: EventType
  action: ActionType
  description: string
  user: string
  userInitials: string
  target: string
  timestamp: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

function createEvent(event: Omit<ActivityEvent, 'userInitials'> & { userInitials?: string }): ActivityEvent {
  return {
    ...event,
    userInitials: event.userInitials ?? getInitials(event.user),
  }
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

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()

    const [
      { data: alerts },
      { data: handoffs },
      { data: bookings },
      { data: contacts },
      { data: properties },
    ] = await Promise.all([
      supabase
        .from('alerts')
        .select('id, type, title, message, created_at, updated_at, metadata')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('handoff_events')
        .select('id, trigger_value, created_at, assigned_to, contacts(name), team_members(name)')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('bookings')
        .select('id, status, property_ref, agent_name, created_at, updated_at, contacts(name)')
        .eq('org_id', auth.orgId)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('contacts')
        .select('id, name, phone, created_at, updated_at, handled_by')
        .eq('org_id', auth.orgId)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('properties')
        .select('id, ref, district, created_at, updated_at, available')
        .eq('org_id', auth.orgId)
        .order('updated_at', { ascending: false })
        .limit(20),
    ])

    const alertEvents: ActivityEvent[] = (alerts ?? []).map((alert) =>
      createEvent({
        id: `alert-${alert.id}`,
        eventType:
          alert.type === 'handoff' || alert.type === 'sentiment'
            ? 'conversation'
            : alert.type === 'booking'
              ? 'booking'
              : alert.type === 'lead'
                ? 'contact'
                : 'system',
        action: 'Created',
        description: alert.title ? `${alert.title}. ${alert.message}` : alert.message,
        user: 'System',
        userInitials: 'SY',
        target: typeof alert.metadata?.deepLink === 'string' ? 'Dashboard Alert' : alert.type,
        timestamp: alert.created_at,
      }),
    )

    const handoffEvents: ActivityEvent[] = (handoffs ?? []).map((handoff) => {
      const contactName = extractRelatedName(handoff.contacts)
      const agentName = extractRelatedName(handoff.team_members)
      return createEvent({
        id: `handoff-${handoff.id}`,
        eventType: 'conversation',
        action: 'Updated',
        description: `Conversation handoff created for ${contactName ?? 'Unknown contact'}${agentName ? ` and assigned to ${agentName}` : ''}.`,
        user: agentName ?? 'System',
        userInitials: agentName ? undefined : 'SY',
        target: handoff.trigger_value || 'Handoff',
        timestamp: handoff.created_at,
      })
    })

    const bookingEvents: ActivityEvent[] = (bookings ?? []).map((booking) => {
      const contactName = extractRelatedName(booking.contacts)
      const isCreated = booking.created_at === booking.updated_at
      return createEvent({
        id: `booking-${booking.id}`,
        eventType: 'booking',
        action: isCreated ? 'Created' : 'Updated',
        description: `${isCreated ? 'Booking created' : 'Booking updated'} for ${contactName ?? 'Unknown contact'}${booking.property_ref ? ` on ${booking.property_ref}` : ''}.`,
        user: booking.agent_name ?? 'System',
        userInitials: booking.agent_name ? undefined : 'SY',
        target: booking.property_ref ?? booking.id,
        timestamp: booking.updated_at,
      })
    })

    const contactEvents: ActivityEvent[] = (contacts ?? []).map((contact) => {
      const isCreated = contact.created_at === contact.updated_at
      return createEvent({
        id: `contact-${contact.id}`,
        eventType: 'contact',
        action: isCreated ? 'Created' : 'Updated',
        description: `${isCreated ? 'Contact created' : 'Contact updated'} for ${contact.name ?? contact.phone}.`,
        user: contact.handled_by === 'human' ? 'Team' : 'System',
        userInitials: contact.handled_by === 'human' ? 'TM' : 'SY',
        target: contact.name ?? contact.phone,
        timestamp: contact.updated_at,
      })
    })

    const propertyEvents: ActivityEvent[] = (properties ?? []).map((property) => {
      const isCreated = property.created_at === property.updated_at
      return createEvent({
        id: `property-${property.id}`,
        eventType: 'property',
        action: isCreated ? 'Created' : 'Updated',
        description: `${isCreated ? 'Property added' : 'Property updated'} for ${property.ref} in ${property.district}.`,
        user: 'System',
        userInitials: 'SY',
        target: property.ref,
        timestamp: property.updated_at,
      })
    })

    const events = [
      ...alertEvents,
      ...handoffEvents,
      ...bookingEvents,
      ...contactEvents,
      ...propertyEvents,
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 100)

    return NextResponse.json({ data: events })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch activity log', details: String(error) },
      { status: 500 },
    )
  }
}
