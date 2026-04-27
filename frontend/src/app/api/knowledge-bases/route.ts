import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sourceType: z.enum(['document', 'url', 'text']).default('document'),
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
      .from('knowledge_bases')
      .select('*, knowledge_chunks(count)')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const kbIds = (data ?? []).map((kb) => kb.id)
    const { data: agentRows } = kbIds.length
      ? await supabase
          .from('agents')
          .select('knowledge_base_id')
          .eq('org_id', auth.orgId)
          .in('knowledge_base_id', kbIds)
      : { data: [] as Array<{ knowledge_base_id: string | null }> }

    const agentCounts = new Map<string, number>()
    for (const agent of agentRows ?? []) {
      if (!agent.knowledge_base_id) continue
      agentCounts.set(agent.knowledge_base_id, (agentCounts.get(agent.knowledge_base_id) ?? 0) + 1)
    }

    const mapped = (data || []).map((kb) => ({
      ...toCamelCase(kb as unknown as Record<string, unknown>),
      chunkCount: Array.isArray((kb as Record<string, unknown>).knowledge_chunks)
        ? ((kb as Record<string, unknown>).knowledge_chunks as unknown[]).length
        : 0,
      agentCount: agentCounts.get(kb.id) ?? 0,
      knowledgeChunks: undefined,
    }))

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('GET /api/knowledge-bases error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge bases', details: String(error) },
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
    const parsed = createKnowledgeBaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data: knowledgeBase, error } = await supabase
      .from('knowledge_bases')
      .insert({
        org_id: auth.orgId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        source_type: parsed.data.sourceType,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { data: toCamelCase(knowledgeBase as unknown as Record<string, unknown>) },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/knowledge-bases error:', error)
    return NextResponse.json(
      { error: 'Failed to create knowledge base', details: String(error) },
      { status: 500 }
    )
  }
}
