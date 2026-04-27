import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'
import { z } from 'zod'

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sourceType: z.enum(['document', 'url', 'text']).optional(),
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

    const { data: kb, error } = await supabase
      .from('knowledge_bases')
      .select('*, knowledge_chunks(*), agents(count)')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !kb) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
    }

    const agentCount = Array.isArray((kb as Record<string, unknown>).agents)
      ? ((kb as Record<string, unknown>).agents as unknown[]).length
      : 0

    const mapped = toCamelCase(kb as unknown as Record<string, unknown>) as Record<string, unknown>
    mapped.agentCount = agentCount
    delete mapped.agents

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('GET /api/knowledge-bases/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base', details: String(error) },
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
    const parsed = updateKnowledgeBaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify KB exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
    }

    // Build update payload with snake_case keys
    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.sourceType !== undefined) updates.source_type = parsed.data.sourceType

    const { data: updated, error: updateError } = await supabase
      .from('knowledge_bases')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: toCamelCase(updated as unknown as Record<string, unknown>) })
  } catch (error) {
    console.error('PATCH /api/knowledge-bases/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge base', details: String(error) },
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

    // Verify KB exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
    }

    // Cascade delete will handle knowledge_chunks via foreign key
    const { error: deleteError } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('DELETE /api/knowledge-bases/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge base', details: String(error) },
      { status: 500 }
    )
  }
}
