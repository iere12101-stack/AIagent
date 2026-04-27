import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

const createBookingSchema = z.object({
  contact_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional().nullable(),
  property_ref: z.string().optional().nullable(),
  property_area: z.string().optional().nullable(),
  scheduled_date: z.string().datetime(),
  scheduled_time: z.string().min(1),
  duration_minutes: z.number().int().min(15).max(240).default(30),
  notes: z.string().optional().nullable(),
})

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('org_id', orgId)
    .order('scheduled_date', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'BOOKINGS_FETCH_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.post('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = createBookingSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid booking payload')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      org_id: orgId,
      ...parsed.data,
      status: 'scheduled',
    })
    .select('*')
    .single()

  if (error) {
    sendApiError(response, 500, 'BOOKING_CREATE_FAILED', error.message)
    return
  }

  response.status(201).json({
    success: true,
    data,
  })
})

export default router
