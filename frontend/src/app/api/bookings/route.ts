import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const createBookingSchema = z.object({
  contactId: z.string().min(1),
  conversationId: z.string().optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentWhatsapp: z.string().optional().nullable(),
  propertyRef: z.string().optional().nullable(),
  propertyArea: z.string().optional().nullable(),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  duration: z.number().min(15).default(30),
  notes: z.string().optional().nullable(),
})

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
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const cursor = searchParams.get('cursor') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build count query
    let countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', auth.orgId)

    if (status) countQuery = countQuery.eq('status', status)
    if (from) countQuery = countQuery.gte('scheduled_date', from)
    if (to) countQuery = countQuery.lte('scheduled_date', to)

    const { count: total } = await countQuery

    // Build data query
    let dataQuery = supabase
      .from('bookings')
      .select('*, contacts(id, name, phone, push_name)')
      .eq('org_id', auth.orgId)

    if (status) dataQuery = dataQuery.eq('status', status)
    if (from) dataQuery = dataQuery.gte('scheduled_date', from)
    if (to) dataQuery = dataQuery.lte('scheduled_date', to)
    if (cursor) dataQuery = dataQuery.gt('id', cursor)

    dataQuery = dataQuery
      .order('scheduled_date', { ascending: false })
      .order('id', { ascending: true })
      .limit(limit + 1)

    const { data: bookings } = await dataQuery

    let nextCursor: string | null = null
    if (bookings && bookings.length > limit) {
      bookings.pop()
      nextCursor = bookings[bookings.length - 1].id
    }

    return NextResponse.json({
      data: bookings ? toCamelCase(bookings) : [],
      nextCursor,
      total: total || 0,
    })
  } catch (error) {
    console.error('GET /api/bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        org_id: auth.orgId,
        contact_id: parsed.data.contactId,
        conversation_id: parsed.data.conversationId ?? null,
        agent_name: parsed.data.agentName ?? null,
        agent_whatsapp: parsed.data.agentWhatsapp ?? null,
        property_ref: parsed.data.propertyRef ?? null,
        property_area: parsed.data.propertyArea ?? null,
        scheduled_date: parsed.data.scheduledDate,
        scheduled_time: parsed.data.scheduledTime,
        duration_minutes: parsed.data.duration,
        notes: parsed.data.notes ?? null,
        status: 'scheduled',
      })
      .select('*, contacts(id, name, phone, push_name)')
      .single()

    if (error) {
      console.error('Insert booking error:', error)
      return NextResponse.json(
        { error: 'Failed to create booking', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: toCamelCase(booking) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking', details: String(error) },
      { status: 500 }
    )
  }
}
