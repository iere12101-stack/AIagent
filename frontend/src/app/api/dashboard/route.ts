import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

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
    const todayISO = new Date().toISOString().split('T')[0]

    const [
      { count: totalConversations },
      { count: totalContacts },
      { count: totalProperties },
      { count: bookingsToday },
      { count: activeConversations },
      { count: newLeads },
    ] = await Promise.all([
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId),
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .gte('scheduled_date', todayISO),
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('status', 'active'),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('lead_status', 'new'),
    ])

    return NextResponse.json({
      data: {
        totalConversations: totalConversations || 0,
        totalContacts: totalContacts || 0,
        totalProperties: totalProperties || 0,
        bookingsToday: bookingsToday || 0,
        activeConversations: activeConversations || 0,
        newLeads: newLeads || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: String(error) },
      { status: 500 }
    )
  }
}
