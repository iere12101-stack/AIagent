import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = createServerClient()
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: toCamelCase(data ?? []) })
}

export async function POST(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const payload = (await request.json()) as {
    direction: 'inbound' | 'outbound'
    senderType?: 'ai' | 'human' | 'contact' | 'system'
    senderName?: string | null
    content: string
    messageType?: 'text' | 'image' | 'document' | 'location'
  }

  const supabase = createServerClient()
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, unread_count')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      org_id: auth.orgId,
      conversation_id: id,
      direction: payload.direction,
      sender_type: payload.senderType ?? 'human',
      sender_name: payload.senderName ?? null,
      content: payload.content,
      message_type: payload.messageType ?? 'text',
      status: payload.direction === 'outbound' ? 'sent' : null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: payload.direction === 'inbound' ? (conversation.unread_count ?? 0) + 1 : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', auth.orgId)

  return NextResponse.json({ data: toCamelCase(data) }, { status: 201 })
}
