import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { buildCursor, parseCursor, sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

const createPropertySchema = z.object({
  ref: z.string().min(1),
  type: z.enum(['apartment', 'villa', 'townhouse', 'penthouse']).nullable().optional(),
  category: z.enum(['sale', 'rent']).nullable().optional(),
  status: z.enum(['ready', 'off-plan']).nullable().optional(),
  district: z.string().min(1),
  building: z.string().nullable().optional(),
  bedrooms: z.string().nullable().optional(),
  price_aed: z.number().nonnegative(),
  size_sqft: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
})

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const search = String(request.query.search ?? '').trim()
  const limit = Math.min(Number(request.query.limit ?? 20), 100)
  const cursor = parseCursor(typeof request.query.cursor === 'string' ? request.query.cursor : null)
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('properties')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (search) {
    query = query.or(`ref.ilike.%${search}%,district.ilike.%${search}%,building.ilike.%${search}%`)
  }

  for (const key of ['type', 'category', 'status', 'district', 'bedrooms'] as const) {
    const value = request.query[key]
    if (typeof value === 'string' && value.trim()) {
      query = query.eq(key, value)
    }
  }

  if (typeof request.query.minPrice === 'string') {
    query = query.gte('price_aed', Number(request.query.minPrice))
  }
  if (typeof request.query.maxPrice === 'string') {
    query = query.lte('price_aed', Number(request.query.maxPrice))
  }
  if (typeof request.query.available === 'string') {
    query = query.eq('available', request.query.available === 'true')
  }
  if (cursor) {
    query = query.or(`updated_at.lt.${cursor.createdAt},and(updated_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
  if (error) {
    sendApiError(response, 500, 'PROPERTIES_FETCH_FAILED', error.message)
    return
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items.at(-1)

  response.json({
    success: true,
    data: items,
    nextCursor: hasMore && last ? buildCursor(last.updated_at, last.id) : null,
  })
})

router.get('/:ref', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', orgId)
    .eq('ref', request.params.ref)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'PROPERTY_FETCH_FAILED', error.message)
    return
  }

  if (!data) {
    sendApiError(response, 404, 'PROPERTY_NOT_FOUND', 'Property was not found')
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

  const parsed = createPropertySchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid property payload')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('properties')
    .insert({
      org_id: orgId,
      ...parsed.data,
    })
    .select('*')
    .single()

  if (error) {
    sendApiError(response, 500, 'PROPERTY_CREATE_FAILED', error.message)
    return
  }

  response.status(201).json({ success: true, data })
})

router.get('/stats', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('properties')
    .select('source')
    .eq('org_id', orgId)

  if (error) {
    sendApiError(response, 500, 'STATS_FETCH_FAILED', error.message)
    return
  }

  const stats = (data ?? []).reduce(
    (acc, property) => {
      if (property.source === 'direct') {
        acc.direct++
      } else if (property.source === 'indirect') {
        acc.indirect++
      }
      return acc
    },
    { direct: 0, indirect: 0 }
  )

  response.json({ success: true, data: stats })
})

router.get('/health', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()

  try {
    // Check database connectivity
    const { data: dbCheck, error: dbError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1)

    if (dbError) {
      response.status(500).json({
        success: false,
        status: 'unhealthy',
        checks: {
          database: 'failed',
          timestamp: new Date().toISOString()
        },
        error: dbError.message
      })
      return
    }

    // Check human-handled conversations
    const { data: humanHandled, error: humanError } = await supabase
      .from('conversations')
      .select('id')
      .eq('handled_by', 'human')

    if (humanError) {
      console.warn('Failed to check human-handled conversations:', humanError)
    }

    // Check recent messages (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, created_at')
      .gte('created_at', fiveMinutesAgo)
      .limit(1)

    if (messagesError) {
      console.warn('Failed to check recent messages:', messagesError)
    }

    response.json({
      success: true,
      status: 'healthy',
      checks: {
        database: 'ok',
        humanHandledConversations: humanHandled?.length ?? 0,
        recentActivity: recentMessages && recentMessages.length > 0,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Health check failed:', error)
    response.status(500).json({
      success: false,
      status: 'unhealthy',
      checks: {
        database: 'error',
        timestamp: new Date().toISOString()
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
