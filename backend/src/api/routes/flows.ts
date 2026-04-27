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
    .from('flows')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'FLOWS_FETCH_FAILED', error.message)
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
  const { data: flow, error: flowError } = await supabase
    .from('flows')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .maybeSingle()

  if (flowError) {
    sendApiError(response, 500, 'FLOW_FETCH_FAILED', flowError.message)
    return
  }

  if (!flow) {
    sendApiError(response, 404, 'FLOW_NOT_FOUND', 'Flow was not found')
    return
  }

  const { data: steps, error: stepsError } = await supabase
    .from('flow_steps')
    .select('*')
    .eq('flow_id', flow.id)
    .order('step_order', { ascending: true })

  if (stepsError) {
    sendApiError(response, 500, 'FLOW_STEPS_FETCH_FAILED', stepsError.message)
    return
  }

  response.json({ success: true, data: { ...flow, steps: steps ?? [] } })
})

export default router
