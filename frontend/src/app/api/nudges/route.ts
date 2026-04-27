import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined
    const nudgeType = searchParams.get('nudgeType') || undefined
    const cursor = searchParams.get('cursor') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build count query
    let countQuery = supabase
      .from('nudge_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', auth.orgId)

    if (status) countQuery = countQuery.eq('status', status)
    if (nudgeType) countQuery = countQuery.eq('nudge_type', nudgeType)

    const { count: total } = await countQuery

    // Build data query
    let dataQuery = supabase
      .from('nudge_jobs')
      .select('*, contacts(id, name, phone, push_name)')
      .eq('org_id', auth.orgId)

    if (status) dataQuery = dataQuery.eq('status', status)
    if (nudgeType) dataQuery = dataQuery.eq('nudge_type', nudgeType)
    if (cursor) dataQuery = dataQuery.gt('id', cursor)

    dataQuery = dataQuery
      .order('scheduled_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(limit + 1)

    const { data: nudges } = await dataQuery

    let nextCursor: string | null = null
    if (nudges && nudges.length > limit) {
      nudges.pop()
      nextCursor = nudges[nudges.length - 1].id
    }

    return NextResponse.json({
      data: nudges ? toCamelCase(nudges) : [],
      nextCursor,
      total: total || 0,
    })
  } catch (error) {
    console.error('GET /api/nudges error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nudges', details: String(error) },
      { status: 500 }
    )
  }
}
