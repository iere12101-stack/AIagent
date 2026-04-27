import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50')

  const { data: gaps, error } = await supabase
    .from('inventory_gaps')
    .select('area, bedrooms, transaction_type, budget_max, used_fallback, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const gapMap: Record<string, { count: number; area: string; bedrooms: string; type: string; avgBudget: number }> = {}
  for (const gap of gaps ?? []) {
    const key = `${gap.area}|${gap.bedrooms}|${gap.transaction_type}`
    if (!gapMap[key]) {
      gapMap[key] = {
        count: 0,
        area: gap.area ?? 'Unknown',
        bedrooms: gap.bedrooms ?? '',
        type: gap.transaction_type ?? 'SALE',
        avgBudget: 0,
      }
    }
    gapMap[key].count += 1
    gapMap[key].avgBudget =
      ((gapMap[key].avgBudget * (gapMap[key].count - 1)) + Number(gap.budget_max ?? 0)) / gapMap[key].count
  }

  const topGaps = Object.values(gapMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({ data: gaps ?? [], topGaps })
}
