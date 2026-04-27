/**
 * PROPERTY INTENT HANDLER
 * 
 * Queries database for properties.
 * NEVER generates fake data.
 * Returns "No properties available" if no results.
 * Only passes results to AI for formatting.
 * 
 * Examples:
 * - "Show me properties in Marina" → query DB, return results or "No properties"
 * - "I want a 2BR apartment" → query DB with filters
 * - "Properties under 2M" → query DB with price filter
 */

import { createClient } from '@supabase/supabase-js'

export interface PropertyQueryParams {
  orgId: string
  area?: string
  bedrooms?: string
  maxPrice?: number
  minPrice?: number
  transactionType?: 'SALE' | 'RENT'
  category?: string
  excludeRefs?: string[]
}

export interface PropertyHandlerResponse {
  found: boolean
  message: string
  properties?: Record<string, unknown>[]
  count?: number
  noResultReason?: 'no_listings_in_area' | 'no_listings_match' | 'db_error' | 'missing_location'
}

/**
 * Query database for properties based on filters
 */
export async function queryProperties(
  params: PropertyQueryParams,
): Promise<PropertyHandlerResponse> {
  const { orgId, area, bedrooms, maxPrice, minPrice, transactionType, category, excludeRefs } = params

  if (!area || area.trim().length === 0) {
    return {
      found: false,
      message: 'Please specify a location so I can check exact available properties.',
      noResultReason: 'missing_location',
    }
  }

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let query = sb
    .from('properties')
    .select('*')
    .eq('org_id', orgId)
    .eq('available', true)
    .order('price_aed', { ascending: true })
    .limit(30)

  if (area) query = query.or(`district.ilike.%${area}%,building.ilike.%${area}%`)
  if (bedrooms) {
    query = bedrooms.toLowerCase() === 'studio'
      ? query.or('bedrooms.ilike.%studio%,bedrooms.eq.0')
      : query.eq('bedrooms', bedrooms)
  }
  if (transactionType) query = query.eq('transaction_type', transactionType)
  if (maxPrice) query = query.lte('price_aed', maxPrice)
  if (minPrice) query = query.gte('price_aed', minPrice)
  if (category) query = query.ilike('category', `%${category}%`)

  console.log(JSON.stringify({
    tag: 'PROPERTY_HANDLER_QUERY',
    area, transactionType, bedrooms, maxPrice, minPrice, category,
    excludedRefs: excludeRefs?.length ?? 0,
  }))

  const { data, error } = await query

  if (error) {
    console.error('[PROPERTY_HANDLER] DB error:', error.message)
    return {
      found: false,
      message: "We're having a brief issue checking our listings. Please try again in a moment or speak with one of our consultants.",
      noResultReason: 'db_error',
    }
  }

  const rawProperties = (data ?? []) as Record<string, unknown>[]
  const areaNeedle = area.trim().toLowerCase()
  const excluded = new Set(
    (excludeRefs ?? [])
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0),
  )
  const properties = rawProperties.filter((property) => {
    const district = String(property.district ?? '').toLowerCase()
    const building = String(property.building ?? '').toLowerCase()
    const fullArea = String((property as { full_area?: unknown }).full_area ?? '').toLowerCase()
    const ref = String(property.ref_number ?? '').trim()
    const inArea = district.includes(areaNeedle) || building.includes(areaNeedle) || fullArea.includes(areaNeedle)
    if (!inArea) return false
    if (!ref) return true
    return !excluded.has(ref)
  }).slice(0, 3)

  if (properties.length === 0) {
    let noResultReason: PropertyHandlerResponse['noResultReason'] = 'no_listings_match'

    if (area) {
      const areaCheck = await sb
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .or(`district.ilike.%${area}%,building.ilike.%${area}%`)
      noResultReason = (areaCheck.count ?? 0) > 0 ? 'no_listings_match' : 'no_listings_in_area'
    }

    const noResultMessages: Record<string, string> = {
      no_listings_in_area: area
        ? 'No properties available in this area.'
        : 'No properties available in this area.',
      no_listings_match: 'No properties available in this area.',
      db_error: "We're having a brief issue checking our listings. Please try again or speak with a consultant.",
    }

    return {
      found: false,
      message: noResultMessages[noResultReason ?? 'no_listings_match'],
      noResultReason,
    }
  }

  return {
    found: true,
    message: '',
    properties,
    count: properties.length,
  }
}

export function buildNoPropertiesMessage(
  lang: 'en' | 'ar',
  area?: string,
  reason?: string,
): string {
  if (lang === 'ar') {
    return area
      ? `عذراً، لا تتوفر لدينا قوائم عقارية في *${area}* حالياً. يمكنني البحث في مناطق قريبة أو التواصل مع أحد مستشارينا.`
      : 'لم أجد تطابقاً دقيقاً بهذه الشروط. يمكنني توسيع البحث أو التواصل مع مستشار.'
  }
  void reason
  return area
    ? `We don't currently have listings in *${area}*. I can search nearby areas or connect you with a consultant.`
    : "I couldn't find an exact match. I can broaden the search or connect you with a consultant."
}
