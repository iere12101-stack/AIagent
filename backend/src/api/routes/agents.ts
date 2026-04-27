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
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'AGENTS_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.get('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'AGENT_FETCH_FAILED', error.message)
    return
  }

  if (!data) {
    sendApiError(response, 404, 'AGENT_NOT_FOUND', 'Agent was not found')
    return
  }

  response.json({ success: true, data })
})

export default router
