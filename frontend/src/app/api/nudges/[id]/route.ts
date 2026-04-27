import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const supabase = createServerClient()

    // Fetch existing nudge and verify it belongs to the org
    const { data: nudge, error: fetchError } = await supabase
      .from('nudge_jobs')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 })
    }

    if (nudge.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending nudges can be cancelled' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('nudge_jobs')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Cancel nudge error:', error)
      return NextResponse.json(
        { error: 'Failed to cancel nudge', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: toCamelCase(updated) })
  } catch (error) {
    console.error('PATCH /api/nudges/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel nudge', details: String(error) },
      { status: 500 }
    )
  }
}
