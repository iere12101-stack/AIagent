import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  readAt: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const cursor = request.nextUrl.searchParams.get('cursor')
    const limit = Math.min(
      Math.max(Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '25', 10) || 25, 1),
      100,
    )

    let dataQuery = supabase
      .from('notifications')
      .select('id, type, title, message, channel, status, metadata, created_at, read_at')
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .eq('channel', 'push')

    if (cursor) {
      dataQuery = dataQuery.lt('created_at', cursor)
    }

    const [{ data, error }, { count }, { count: unreadCount }] = await Promise.all([
      dataQuery.order('created_at', { ascending: false }).limit(limit + 1),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('user_id', auth.userId)
        .eq('channel', 'push'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('user_id', auth.userId)
        .eq('channel', 'push')
        .is('read_at', null),
    ])

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 },
      )
    }

    const rows = data ?? []
    const nextCursor = rows.length > limit ? rows[limit - 1]?.created_at ?? null : null
    const page = rows.slice(0, limit)

    return NextResponse.json({
      data: toCamelCase(page),
      nextCursor,
      total: count ?? 0,
      unreadCount: unreadCount ?? 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = patchSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: payload.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    const readAt = payload.data.readAt ?? new Date().toISOString()

    let query = supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .eq('channel', 'push')
      .is('read_at', null)

    if (payload.data.ids && payload.data.ids.length > 0) {
      query = query.in('id', payload.data.ids)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update notifications', details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update notifications', details: String(error) },
      { status: 500 },
    )
  }
}
