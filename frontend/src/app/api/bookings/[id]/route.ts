import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const updateBookingSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  duration: z.number().min(15).optional(),
  notes: z.string().optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentWhatsapp: z.string().optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(_request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const supabase = createServerClient()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, contacts(id, name, phone, push_name), conversations(id, status)')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ data: toCamelCase(booking) })
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking', details: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const parsed = updateBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify booking exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Build update payload with snake_case mapping
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.scheduledDate !== undefined) updateData.scheduled_date = parsed.data.scheduledDate
    if (parsed.data.scheduledTime !== undefined) updateData.scheduled_time = parsed.data.scheduledTime
    if (parsed.data.duration !== undefined) updateData.duration_minutes = parsed.data.duration
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes
    if (parsed.data.agentName !== undefined) updateData.agent_name = parsed.data.agentName
    if (parsed.data.agentWhatsapp !== undefined) updateData.agent_whatsapp = parsed.data.agentWhatsapp

    const { data: updated, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select('*, contacts(id, name, phone, push_name), conversations(id, status)')
      .single()

    if (error) {
      console.error('Update booking error:', error)
      return NextResponse.json(
        { error: 'Failed to update booking', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: toCamelCase(updated) })
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking', details: String(error) },
      { status: 500 }
    )
  }
}
