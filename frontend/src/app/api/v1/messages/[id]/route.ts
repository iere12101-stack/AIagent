import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select('id, org_id, sender_type, direction')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  if (!(message.direction === 'outbound' && message.sender_type === 'ai')) {
    return NextResponse.json({ error: 'Only outbound AI messages can be deleted here' }, { status: 400 })
  }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
    .eq('org_id', auth.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
