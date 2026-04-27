import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

async function detachConversationReferences(
  orgId: string,
  ids: string[],
): Promise<string | null> {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('inventory_gaps')
    .update({ conversation_id: null })
    .eq('org_id', orgId)
    .in('conversation_id', ids)

  if (!error) {
    return null
  }

  // Some databases may not have this table yet. In that case, let the delete continue.
  if (error.code === '42P01') {
    return null
  }

  return error.message
}

export async function PATCH(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json()) as { ids?: string[]; status?: string; unreadCount?: number }
  if (!Array.isArray(payload.ids) || payload.ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.status) updates.status = payload.status
  if (typeof payload.unreadCount === 'number') updates.unread_count = payload.unreadCount

  const supabase = createServerClient()
  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .in('id', payload.ids)
    .eq('org_id', auth.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: payload.ids.length })
}

export async function DELETE(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json()) as { ids?: string[] }
  if (!Array.isArray(payload.ids) || payload.ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const detachError = await detachConversationReferences(auth.orgId, payload.ids)
  if (detachError) {
    return NextResponse.json({ error: detachError }, { status: 500 })
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .in('id', payload.ids)
    .eq('org_id', auth.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
