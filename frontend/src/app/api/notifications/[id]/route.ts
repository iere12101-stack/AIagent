import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  readAt: z.string().datetime().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const payload = patchSchema.safeParse(await request.json().catch(() => ({})))

    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: payload.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: payload.data.readAt ?? new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .eq('channel', 'push')
      .select('id, type, title, message, channel, status, metadata, created_at, read_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ data: toCamelCase(data) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update notification', details: String(error) },
      { status: 500 },
    )
  }
}
