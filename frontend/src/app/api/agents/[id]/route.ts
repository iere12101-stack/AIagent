import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  knowledgeBaseId: z.string().optional().nullable(),
  defaultFlowId: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(50).max(8000).optional(),
  active: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

function mapAgentRelations(agent: Record<string, unknown>) {
  const item = toCamelCase(agent) as Record<string, unknown>

  item.knowledgeBase = Array.isArray(agent.knowledge_bases) && (agent.knowledge_bases as unknown[]).length > 0
    ? toCamelCase((agent.knowledge_bases as Record<string, unknown>[])[0])
    : null
  item.defaultFlow = Array.isArray(agent.flows) && (agent.flows as unknown[]).length > 0
    ? toCamelCase((agent.flows as Record<string, unknown>[])[0])
    : null

  delete item.knowledgeBases
  delete item.flows

  return item
}

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

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*, knowledge_bases(id, name), flows(id, name)')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ data: mapAgentRelations(agent as Record<string, unknown>) })
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent', details: String(error) },
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
    const parsed = updateAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify agent exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Build update payload with snake_case keys
    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.systemPrompt !== undefined) updates.system_prompt = parsed.data.systemPrompt
    if (parsed.data.knowledgeBaseId !== undefined) updates.knowledge_base_id = parsed.data.knowledgeBaseId
    if (parsed.data.defaultFlowId !== undefined) updates.default_flow_id = parsed.data.defaultFlowId
    if (parsed.data.temperature !== undefined) updates.temperature = parsed.data.temperature
    if (parsed.data.maxTokens !== undefined) updates.max_tokens = parsed.data.maxTokens
    if (parsed.data.active !== undefined) updates.active = parsed.data.active

    const { data: updated, error: updateError } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select('*, knowledge_bases(id, name), flows(id, name)')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: mapAgentRelations(updated as Record<string, unknown>) })
  } catch (error) {
    console.error('PATCH /api/agents/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update agent', details: String(error) },
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

    // Verify agent exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('DELETE /api/agents/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent', details: String(error) },
      { status: 500 }
    )
  }
}
