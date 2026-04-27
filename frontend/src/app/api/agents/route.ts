import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const createAgentSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  knowledgeBaseId: z.string().optional().nullable(),
  defaultFlowId: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(50).max(8000).default(1000),
  active: z.boolean().default(true),
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
      .from('agents')
      .select('*, knowledge_bases(id, name), flows(id, name)')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mapped = (data || []).map((a) => {
      const item = toCamelCase(a as unknown as Record<string, unknown>) as Record<string, unknown>
      const raw = a as Record<string, unknown>

      item.knowledgeBase = Array.isArray(raw.knowledge_bases) && (raw.knowledge_bases as unknown[]).length > 0
        ? toCamelCase((raw.knowledge_bases as Record<string, unknown>[])[0])
        : null
      item.defaultFlow = Array.isArray(raw.flows) && (raw.flows as unknown[]).length > 0
        ? toCamelCase((raw.flows as Record<string, unknown>[])[0])
        : null

      delete item.knowledgeBases
      delete item.flows

      return item
    })

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('GET /api/agents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
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
    const parsed = createAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        org_id: auth.orgId,
        name: parsed.data.name,
        system_prompt: parsed.data.systemPrompt,
        knowledge_base_id: parsed.data.knowledgeBaseId ?? null,
        default_flow_id: parsed.data.defaultFlowId ?? null,
        temperature: parsed.data.temperature,
        max_tokens: parsed.data.maxTokens,
        active: parsed.data.active,
      })
      .select('*, knowledge_bases(id, name), flows(id, name)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const item = toCamelCase(agent as unknown as Record<string, unknown>) as Record<string, unknown>
    const raw = agent as Record<string, unknown>

    item.knowledgeBase = Array.isArray(raw.knowledge_bases) && (raw.knowledge_bases as unknown[]).length > 0
      ? toCamelCase((raw.knowledge_bases as Record<string, unknown>[])[0])
      : null
    item.defaultFlow = Array.isArray(raw.flows) && (raw.flows as unknown[]).length > 0
      ? toCamelCase((raw.flows as Record<string, unknown>[])[0])
      : null
    delete item.knowledgeBases
    delete item.flows

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('POST /api/agents error:', error)
    return NextResponse.json(
      { error: 'Failed to create agent', details: String(error) },
      { status: 500 }
    )
  }
}
