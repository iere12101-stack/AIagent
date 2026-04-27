import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  plan: z.string().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'SETTINGS_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.patch('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = updateSettingsSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid settings payload')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select('*')
    .single()

  if (error) {
    sendApiError(response, 500, 'SETTINGS_UPDATE_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

export default router
