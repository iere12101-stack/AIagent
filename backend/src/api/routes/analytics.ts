import { Router } from 'express'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

async function countRows(table: string, orgId: string, filters: Record<string, string> = {}): Promise<number> {
  const supabase = getSupabaseAdmin()
  let query = supabase.from(table).select('*', { count: 'exact', head: true }).eq('org_id', orgId)

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }

  const { count, error } = await query
  if (error) {
    throw error
  }

  return count ?? 0
}

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  try {
    const [conversations, contacts, bookings, nudges, properties] = await Promise.all([
      countRows('conversations', orgId),
      countRows('contacts', orgId),
      countRows('bookings', orgId),
      countRows('nudge_jobs', orgId),
      countRows('properties', orgId),
    ])

    response.json({
      success: true,
      data: {
        conversations,
        contacts,
        bookings,
        nudges,
        properties,
      },
    })
  } catch (error) {
    sendApiError(response, 500, 'ANALYTICS_FETCH_FAILED', error instanceof Error ? error.message : 'Analytics query failed')
  }
})

export default router
