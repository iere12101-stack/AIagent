import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { buildCursor, parseCursor, sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'
import { whatsAppGateway } from '../../whatsapp/WhatsAppGateway.js'

const router = Router()

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  senderName: z.string().optional(),
})

interface ConversationSendContext {
  id: string
  device_id: string | null
  contacts:
    | {
        phone: string
        name: string | null
      }
    | null
}

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  const conversationId = typeof request.query.conversationId === 'string' ? request.query.conversationId : null
  if (!orgId || !conversationId) {
    sendApiError(response, 400, 'CONVERSATION_REQUIRED', 'Organization and conversation are required')
    return
  }

  const limit = Math.min(Number(request.query.limit ?? 50), 100)
  const cursor = parseCursor(typeof request.query.cursor === 'string' ? request.query.cursor : null)
  const supabase = getSupabaseAdmin()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('org_id', orgId)
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation) {
    sendApiError(response, 404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found')
    return
  }

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
  if (error) {
    sendApiError(response, 500, 'MESSAGES_FETCH_FAILED', error.message)
    return
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items.at(-1)

  response.json({
    success: true,
    data: items.reverse(),
    nextCursor: hasMore && last ? buildCursor(last.created_at, last.id) : null,
  })
})

router.post('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = sendMessageSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid message payload')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, device_id, contacts(phone, name)')
    .eq('org_id', orgId)
    .eq('id', parsed.data.conversationId)
    .maybeSingle<ConversationSendContext>()

  if (!conversation) {
    sendApiError(response, 404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found')
    return
  }

  if (!conversation.contacts?.phone) {
    sendApiError(response, 400, 'CONTACT_PHONE_MISSING', 'Conversation contact does not have a WhatsApp phone number')
    return
  }

  let sendResult: { deviceId: string; messageId: string | null }
  try {
    sendResult = await whatsAppGateway.sendText({
      orgId,
      deviceId: conversation.device_id,
      phone: conversation.contacts.phone,
      text: parsed.data.content,
    })
  } catch (error) {
    await supabase.from('messages').insert({
      org_id: orgId,
      conversation_id: parsed.data.conversationId,
      direction: 'outbound',
      sender_type: 'human',
      sender_name: parsed.data.senderName ?? 'Agent',
      content: parsed.data.content,
      status: 'failed',
      metadata: {
        transport: 'baileys',
        error: error instanceof Error ? error.message : 'Unknown WhatsApp transport error',
      },
    })

    sendApiError(
      response,
      503,
      'MESSAGE_SEND_FAILED',
      error instanceof Error ? error.message : 'Failed to send outbound WhatsApp message',
    )
    return
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      org_id: orgId,
      conversation_id: parsed.data.conversationId,
      direction: 'outbound',
      sender_type: 'human',
      sender_name: parsed.data.senderName ?? 'Agent',
      content: parsed.data.content,
      wa_message_id: sendResult.messageId,
      status: 'sent',
      metadata: {
        transport: 'baileys',
        deviceId: sendResult.deviceId,
      },
    })
    .select('*')
    .single()

  if (error) {
    sendApiError(response, 500, 'MESSAGE_LOG_FAILED', error.message)
    return
  }

  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.conversationId)

  response.status(201).json({ success: true, data })
})

export default router
