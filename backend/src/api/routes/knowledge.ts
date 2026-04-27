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
    .from('knowledge_bases')
    .select('*, knowledge_chunks(count)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'KNOWLEDGE_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.get('/:id/chunks', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('id, content, metadata, created_at')
    .eq('org_id', orgId)
    .eq('knowledge_base_id', request.params.id)
    .order('created_at', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'KNOWLEDGE_CHUNKS_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

export default router
