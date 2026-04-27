import { Router } from 'express'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

function requireAdmin(request: AuthenticatedRequest): boolean {
  return ['owner', 'admin'].includes(request.auth?.role ?? '')
}

async function detachConversationReferences(orgId: string, ids: string[]): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  // inventory_gaps keeps an optional conversation_id but its FK was created
  // without an ON DELETE action, so it blocks conversation deletion unless
  // we detach those historical gap records first.
  const { error } = await supabase
    .from('inventory_gaps')
    .update({ conversation_id: null })
    .eq('org_id', orgId)
    .in('conversation_id', ids)

  return error?.message ?? null
}

router.patch('/bulk', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const { ids, ...updates } = request.body as { ids?: string[] } & Record<string, unknown>
  if (!Array.isArray(ids) || ids.length === 0) {
    sendApiError(response, 400, 'IDS_REQUIRED', 'ids required')
    return
  }

  const normalizedUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof updates.status === 'string') normalizedUpdates.status = updates.status
  if (typeof updates.unread_count === 'number') normalizedUpdates.unread_count = updates.unread_count
  if (typeof updates.unreadCount === 'number') normalizedUpdates.unread_count = updates.unreadCount
  if (typeof updates.assigned_to === 'string') normalizedUpdates.assigned_to = updates.assigned_to
  if (typeof updates.assignedTo === 'string') normalizedUpdates.assigned_to = updates.assignedTo

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('conversations')
    .update(normalizedUpdates)
    .in('id', ids)
    .eq('org_id', orgId)

  if (error) {
    sendApiError(response, 500, 'CONVERSATION_BULK_UPDATE_FAILED', error.message)
    return
  }

  response.json({ success: true, count: ids.length })
})

router.delete('/bulk', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const { ids } = request.body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    sendApiError(response, 400, 'IDS_REQUIRED', 'ids required')
    return
  }

  const supabase = getSupabaseAdmin()
  const detachError = await detachConversationReferences(orgId, ids)
  if (detachError) {
    sendApiError(response, 500, 'CONVERSATION_REFERENCE_CLEANUP_FAILED', detachError)
    return
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .in('id', ids)
    .eq('org_id', orgId)

  if (error) {
    sendApiError(response, 500, 'CONVERSATION_BULK_DELETE_FAILED', error.message)
    return
  }

  response.json({ success: true })
})

router.patch('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const updates = request.body as Record<string, unknown>
  const normalizedUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof updates.status === 'string') normalizedUpdates.status = updates.status
  if (typeof updates.unread_count === 'number') normalizedUpdates.unread_count = updates.unread_count
  if (typeof updates.unreadCount === 'number') normalizedUpdates.unread_count = updates.unreadCount
  if (typeof updates.handled_by === 'string') normalizedUpdates.handled_by = updates.handled_by
  if (typeof updates.handledBy === 'string') normalizedUpdates.handled_by = updates.handledBy
  if (typeof updates.assigned_to === 'string') normalizedUpdates.assigned_to = updates.assigned_to
  if (typeof updates.assignedTo === 'string') normalizedUpdates.assigned_to = updates.assignedTo

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('conversations')
    .update(normalizedUpdates)
    .eq('id', request.params.id)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'CONVERSATION_UPDATE_FAILED', error.message)
    return
  }

  response.json({ success: true, data })
})

router.post('/reset-conversation', async (request: AuthenticatedRequest, response) => {
  if (!requireAdmin(request)) {
    sendApiError(response, 403, 'ADMIN_REQUIRED', 'Admin access is required')
    return
  }

  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const { conversationId, resetAll } = request.body as {
    conversationId?: string
    resetAll?: boolean
  }

  const supabase = getSupabaseAdmin()

  if (resetAll) {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('conversations')
      .update({ handled_by: 'ai', updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('handled_by', 'human')
      .lt('updated_at', cutoff)
      .select('id')

    if (error) {
      sendApiError(response, 500, 'CONVERSATION_RESET_FAILED', error.message)
      return
    }

    response.json({
      success: true,
      reset: data?.length ?? 0,
      message: `Reset ${data?.length ?? 0} stuck conversations`,
    })
    return
  }

  if (conversationId) {
    const { error } = await supabase
      .from('conversations')
      .update({ handled_by: 'ai', updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', conversationId)

    if (error) {
      sendApiError(response, 500, 'CONVERSATION_RESET_FAILED', error.message)
      return
    }

    response.json({ success: true, reset: 1, conversationId })
    return
  }

  sendApiError(response, 400, 'INVALID_RESET_INPUT', 'Provide conversationId or resetAll: true')
})

export default router
