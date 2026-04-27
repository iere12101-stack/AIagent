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
  const { data } = await supabase
    .from('properties')
    .select('transaction_type, category, district, price_aed, available, status, source')
    .eq('org_id', auth.orgId)
  if (!data) {
    return NextResponse.json({
      totalListings: 0,
      availablePercent: 0,
      avgPrice: 0,
      topDistrict: '—',
      topDistrictCount: 0,
      salePercent: 0,
      total: 0,
      direct: 0,
      indirect: 0,
      available: 0,
      unavailable: 0,
      availabilityPct: 0,
      sale: 0,
      rent: 0,
      ready: 0,
      offPlan: 0,
      avgPriceAed: 0,
      topAreas: [],
    })
  }
  const total = data.length
  const available = data.filter(p => p.available).length
  const prices = data.map(p => Number(p.price_aed))
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const saleCount = data.filter(p => p.transaction_type === 'SALE').length
  const rentCount = data.filter(p => p.transaction_type === 'RENT').length
  const directCount = data.filter(p => p.source === 'direct').length
  const indirectCount = data.filter(p => p.source === 'indirect').length
  const readyCount = data.filter(p => p.status === 'Ready').length
  const offPlanCount = data.filter(p => p.status === 'Off Plan').length
  const districtCounts: Record<string, number> = {}
  for (const p of data) {
    if (p.district) districtCounts[p.district] = (districtCounts[p.district] || 0) + 1
  }
  const topDistrict = Object.entries(districtCounts).sort((a, b) => b[1] - a[1])[0]
  const topAreas = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area, count]) => ({ area, count }))

  return NextResponse.json({
    totalListings: total,
    availablePercent: total > 0 ? Math.round((available / total) * 100) : 0,
    avgPrice,
    topDistrict: topDistrict?.[0] || '—',
    topDistrictCount: topDistrict?.[1] || 0,
    salePercent: total > 0 ? Math.round((saleCount / total) * 100) : 0,
    total,
    direct: directCount,
    indirect: indirectCount,
    available,
    unavailable: total - available,
    availabilityPct: total > 0 ? Math.round((available / total) * 100) : 0,
    sale: saleCount,
    rent: rentCount,
    ready: readyCount,
    offPlan: offPlanCount,
    avgPriceAed: avgPrice,
    topAreas,
  })
}
