import { Router } from 'express'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('nudge_jobs')
    .select('*')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: false })

  if (typeof request.query.status === 'string' && request.query.status) {
    query = query.eq('status', request.query.status)
  }
  if (typeof request.query.type === 'string' && request.query.type) {
    query = query.eq('nudge_type', request.query.type)
  }

  const { data, error } = await query
  if (error) {
    sendApiError(response, 500, 'NUDGES_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.post('/:id/cancel', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('nudge_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .select('*')
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'NUDGE_CANCEL_FAILED', error.message)
    return
  }

  if (!data) {
    sendApiError(response, 404, 'NUDGE_NOT_FOUND', 'Pending nudge was not found')
    return
  }

  response.json({ success: true, data })
})

export default router
