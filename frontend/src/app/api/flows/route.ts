import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const flowStepSchema = z.object({
  order: z.number().min(0),
  type: z.enum(['send_message', 'ask_question', 'ai_response', 'condition', 'action']),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  nextStepId: z.string().optional().nullable(),
})

const createFlowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  triggerType: z.enum(['new_contact', 'keyword', 'intent']).default('new_contact'),
  triggerData: z.record(z.string(), z.unknown()).optional().default({}),
  active: z.boolean().default(true),
  steps: z.array(flowStepSchema).optional().default([]),
})

export async function GET(request: NextRequest) {
  let auth: { userId: string; orgId: string; role: string; email: string }
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('flows')
      .select('*, flow_steps(count), agents(count)')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mapped = (data || []).map((f) => ({
      ...toCamelCase(f as unknown as Record<string, unknown>),
      stepCount: Array.isArray((f as Record<string, unknown>).flow_steps)
        ? ((f as Record<string, unknown>).flow_steps as unknown[]).length
        : 0,
      agentCount: Array.isArray((f as Record<string, unknown>).agents)
        ? ((f as Record<string, unknown>).agents as unknown[]).length
        : 0,
      flowSteps: undefined,
      agents: undefined,
    }))

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('GET /api/flows error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flows', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let auth: { userId: string; orgId: string; role: string; email: string }
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const parsed = createFlowSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { steps, ...flowData } = parsed.data
    const supabase = createServerClient()

    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .insert({
        org_id: auth.orgId,
        name: flowData.name,
        description: flowData.description ?? null,
        trigger_type: flowData.triggerType,
        trigger_data: flowData.triggerData,
        active: flowData.active,
      })
      .select()
      .single()

    if (flowError) {
      return NextResponse.json({ error: flowError.message }, { status: 500 })
    }

    // Insert steps separately
    if (steps.length > 0) {
      const stepsToInsert = steps.map((s, i) => ({
        flow_id: flow.id,
        step_order: s.order ?? i,
        step_type: s.type,
        config: s.config || {},
        next_step_id: s.nextStepId ?? null,
      }))

      const { error: stepsError } = await supabase
        .from('flow_steps')
        .insert(stepsToInsert)

      if (stepsError) {
        return NextResponse.json({ error: stepsError.message }, { status: 500 })
      }
    }

    // Fetch the complete flow with steps
    const { data: complete, error: fetchError } = await supabase
      .from('flows')
      .select('*, flow_steps(*)')
      .eq('id', flow.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const mapped = toCamelCase(complete as unknown as Record<string, unknown>)
    return NextResponse.json({ data: mapped }, { status: 201 })
  } catch (error) {
    console.error('POST /api/flows error:', error)
    return NextResponse.json(
      { error: 'Failed to create flow', details: String(error) },
      { status: 500 }
    )
  }
}
