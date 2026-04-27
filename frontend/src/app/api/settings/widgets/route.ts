import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const supabase = createServerClient()
    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', auth.userId)
      .single()
    return NextResponse.json({ widgets: data?.preferences?.widgets || {} })
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ widgets: {} })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { widgets } = await request.json()
    const supabase = createServerClient()
    const { data: user } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', auth.userId)
      .single()
    const prefs = user?.preferences || {}
    prefs.widgets = widgets
    await supabase
      .from('users')
      .update({ preferences: prefs })
      .eq('id', auth.userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Failed to save widgets' }, { status: 500 })
  }
}
