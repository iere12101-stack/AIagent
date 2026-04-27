import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { PropertyMatcher } from '../../properties/PropertyMatcher.js'
import { buildCursor, parseCursor, sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()
// Dashboard support only. Live WhatsApp AI replies go through:
// BaileysManager -> WhatsAppGateway -> MessageRouter -> generateReply().
const propertyMatcher = new PropertyMatcher()

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  lead_status: z.enum(['new', 'cold', 'warm', 'hot', 'converted', 'lost', 'boiling']).optional(),
  area_interest: z.string().optional().nullable(),
  bedrooms: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  intent: z.string().optional().nullable(),
  language: z.enum(['en', 'ar']).optional(),
  handled_by: z.enum(['ai', 'human']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
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
    .from('contacts')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (cursor) {
    query = query.or(`updated_at.lt.${cursor.createdAt},and(updated_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
  if (error) {
    sendApiError(response, 500, 'CONTACTS_FETCH_FAILED', error.message)
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

router.get('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'CONTACT_FETCH_FAILED', error.message)
    return
  }

  if (!data) {
    sendApiError(response, 404, 'CONTACT_NOT_FOUND', 'Contact was not found')
    return
  }

  response.json({ success: true, data })
})

router.get('/:contactId/property-matches', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('id, area_interest, bedrooms, budget, intent, contact_memory')
    .eq('id', request.params.contactId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'CONTACT_FETCH_FAILED', error.message)
    return
  }

  if (!contact) {
    sendApiError(response, 404, 'CONTACT_NOT_FOUND', 'Contact was not found')
    return
  }

  const memory = contact.contact_memory && typeof contact.contact_memory === 'object'
    ? (contact.contact_memory as Record<string, unknown>)
    : {}

  const area = typeof memory.area_interest === 'string' ? memory.area_interest : contact.area_interest
  const bedrooms = typeof memory.bedrooms === 'string' ? memory.bedrooms : contact.bedrooms
  const budget = typeof memory.budget === 'string' ? memory.budget : contact.budget
  const intent = typeof memory.intent === 'string' ? memory.intent : contact.intent
  const parsedBudget = budget ? propertyMatcher.parseBudget(String(budget)) : {}

  const waterfall = await propertyMatcher.searchWaterfall({
    orgId,
    area: area ? propertyMatcher.normalizeArea(String(area)) : undefined,
    bedrooms: bedrooms ? String(bedrooms) : undefined,
    transactionType: intent === 'rent' ? 'RENT' : intent === 'buy' ? 'SALE' : undefined,
    category: intent === 'rent' ? 'rent' : intent === 'buy' ? 'sale' : undefined,
    minPrice: parsedBudget.min,
    maxPrice: parsedBudget.max,
    limit: 3,
  })

  response.json({
    success: true,
    data: waterfall.properties,
    source: waterfall.source,
    directCount: waterfall.directCount,
    indirectCount: waterfall.indirectCount,
    usedFallback: waterfall.usedFallback,
  })
})

router.patch('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = updateContactSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid contact update')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contacts')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .select('*')
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'CONTACT_UPDATE_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

export default router
