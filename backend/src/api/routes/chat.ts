import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'
import { generateReply, sanitize } from '../../modules/ai/aiService.js'

const router = Router()

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

function normalizeMemoryValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (/^\d+$/.test(value)) return Number(value)
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

router.post('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = chatSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid chat payload')
    return
  }

  const { message, conversationId, phoneNumber, history } = parsed.data
  const supabase = getSupabaseAdmin()

  let resolvedPhoneNumber = phoneNumber ?? ''
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = history ?? []
  let memory: Record<string, unknown> = {}

  if (conversationId) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, contact_id, contacts(phone)')
      .eq('org_id', orgId)
      .eq('id', conversationId)
      .maybeSingle<{ id: string; contact_id: string; contacts: { phone: string } | null }>()

    if (!conversation) {
      sendApiError(response, 404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found')
      return
    }

    if (conversation.contacts?.phone) {
      resolvedPhoneNumber = conversation.contacts.phone
    }

    const { data: memRows } = await supabase
      .from('contact_memory')
      .select('key, value')
      .eq('contact_id', conversation.contact_id)

    memory = Object.fromEntries(
      (memRows ?? []).map((row) => [row.key, normalizeMemoryValue(row.value)]),
    )

    if (!history || history.length === 0) {
      const { data: msgRows } = await supabase
        .from('messages')
        .select('direction, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(16)

      conversationHistory = (msgRows ?? []).reverse().map((row) => ({
        role: (row.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: row.content as string,
      }))
    }
  }

  const normalizedPhone = resolvedPhoneNumber?.startsWith('+')
    ? resolvedPhoneNumber
    : (resolvedPhoneNumber ? `+${resolvedPhoneNumber.replace(/\D/g, '')}` : '+0000000000')

  const result = await generateReply({
    orgId,
    phoneNumber: normalizedPhone,
    message,
    conversationHistory,
    memory,
  })

  const safeReply = sanitize(result.reply)

  if (conversationId) {
    await supabase.from('messages').insert({
      org_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      sender_name: 'Aya AI',
      content: safeReply,
      message_type: 'text',
      status: 'sent',
      metadata: {
        lane: result.lane,
        lang: result.lang,
        replyMode: result.replyMode,
        propertyRefs: result.shownPropertyRefs ?? [],
      },
    })

    await supabase
      .from('conversations')
      .update({
        handled_by: result.handoff ? 'human' : 'ai',
        last_message_at: new Date().toISOString(),
        detected_lang: result.lang,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('org_id', orgId)
  }

  response.json({
    reply: safeReply,
    language: result.lang,
    shouldHandoff: result.handoff,
    handoff: result.handoff,
    lane: result.lane,
    replyMode: result.replyMode,
    shownPropertyRefs: result.shownPropertyRefs ?? [],
    resolvedAgent: result.resolvedAgent ?? null,
  })
})

export default router
