import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const updateFlowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  triggerType: z.enum(['new_contact', 'keyword', 'intent']).optional(),
  triggerData: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  let auth: { userId: string; orgId: string; role: string; email: string }
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const { id } = await context.params
    const supabase = createServerClient()

    const { data: flow, error } = await supabase
      .from('flows')
      .select('*, flow_steps(*), agents(count)')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    const agentCount = Array.isArray((flow as Record<string, unknown>).agents)
      ? ((flow as Record<string, unknown>).agents as unknown[]).length
      : 0

    // Sort steps by step_order
    const steps = Array.isArray((flow as Record<string, unknown>).flow_steps)
      ? ((flow as Record<string, unknown>).flow_steps as Record<string, unknown>[])
          .sort((a, b) => (a.step_order as number) - (b.step_order as number))
          .map((s) => toCamelCase(s))
      : []

    const mapped = toCamelCase(flow as unknown as Record<string, unknown>) as Record<string, unknown>
    mapped.flowSteps = steps
    mapped.agentCount = agentCount
    delete mapped.agents

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('GET /api/flows/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flow', details: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let auth: { userId: string; orgId: string; role: string; email: string }
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const parsed = updateFlowSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify flow exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('flows')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    // Build update payload with snake_case keys
    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.triggerType !== undefined) updates.trigger_type = parsed.data.triggerType
    if (parsed.data.triggerData !== undefined) updates.trigger_data = parsed.data.triggerData
    if (parsed.data.active !== undefined) updates.active = parsed.data.active

    const { data: updated, error: updateError } = await supabase
      .from('flows')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: toCamelCase(updated as unknown as Record<string, unknown>) })
  } catch (error) {
    console.error('PATCH /api/flows/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update flow', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let auth: { userId: string; orgId: string; role: string; email: string }
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const { id } = await context.params
    const supabase = createServerClient()

    // Verify flow exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('flows')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    // Cascade delete will handle flow_steps via foreign key
    const { error: deleteError } = await supabase
      .from('flows')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('DELETE /api/flows/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete flow', details: String(error) },
      { status: 500 }
    )
  }
}
