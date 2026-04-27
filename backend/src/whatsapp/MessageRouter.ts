import type { WAMessage } from '@whiskeysockets/baileys'
import { env } from '../config/env.js'
import { BUILD_ID, PIPELINE_VERSION, buildRuntimeFingerprint } from '../config/runtimeFingerprint.js'
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js'
import { acquireLock, isAlreadyProcessed, markProcessed } from '../lib/messageDedup.js'
import { generateReply, sanitize, type ReplyResult } from '../modules/ai/aiService.js'
import { detectPrimaryIntent, extractPropertyDetails } from '../modules/ai/intentDetector.js'
import { buildSpecificCompanyResponse, getCompanyInfoAsString } from '../modules/ai/handlers/companyHandler.js'
import {
  detectAgentDirectoryRequest,
  getAgentByName,
  getAgentResponse,
  getDirectoryResponse,
} from '../modules/ai/handlers/agentHandler.js'
import { findBestAgent, findAgentByName } from '../config/companyData.js'
import { sendAgentAlert } from '../services/agentAlert.js'
import { queryProperties } from '../modules/ai/handlers/propertyHandler.js'

export class MessageRouter {
  private readonly supabase = isSupabaseConfigured() ? getSupabaseAdmin() : null
  private readonly propertyFollowUpPattern = /\b(more|another|next|other|else|extra|additional)\b.*\b(option|options|listing|listings|property|properties)\b|\b(show|send|give)\b.*\bmore\b|\bmore options?\b|\bmore properties?\b/i
  private readonly shortContinuationPattern = /^(jvc|jlt|marina|downtown|business bay|rent|buy|sale|studio|\d+\s*(br|bhk|bed|bedroom|bedrooms)|1bhk|2bhk|3bhk)$/i

  async routeMessage(deviceId: string, orgId: string, message: WAMessage): Promise<void> {
    if (!this.supabase) return

    const messageId = message.key?.id
    if (!messageId || message.key.fromMe) return

    const text = this.extractText(message)
    if (!text.trim()) return

    if (isAlreadyProcessed(messageId)) {
      console.log(`[DEDUP] Skipped duplicate msgId: ${messageId}`)
      return
    }
    markProcessed(messageId)

    const jid = message.key.remoteJid ?? ''
    const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
    const releaseLock = await acquireLock(phone)

    this.handleIncoming(message, text, jid, phone, deviceId, orgId)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[HANDLER] ${phone}:`, msg)
      })
      .finally(() => releaseLock())
  }

  private async handleIncoming(
    msg: WAMessage,
    text: string,
    jid: string,
    phone: string,
    deviceId: string,
    orgId: string,
  ): Promise<void> {
    if (!this.supabase) return
    const supabase = this.supabase
    const now = new Date().toISOString()

    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .upsert(
        {
          org_id: orgId,
          phone: `+${phone}`,
          name: msg.pushName ?? '',
          push_name: msg.pushName ?? '',
          last_message_at: now,
          updated_at: now,
        },
        { onConflict: 'org_id,phone' },
      )
      .select('id')
      .single()

    if (contactErr || !contact) {
      console.error('[HANDLER] Contact upsert failed:', contactErr?.message)
      return
    }

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .upsert(
        {
          org_id: orgId,
          contact_id: contact.id,
          device_id: deviceId,
          status: 'active',
          handled_by: 'ai',
          last_message_at: now,
          updated_at: now,
        },
        { onConflict: 'org_id,contact_id' },
      )
      .select('id, handled_by')
      .single()

    let resolvedConv = conv
    if (convErr || !resolvedConv) {
      const msg = convErr?.message ?? 'unknown'
      console.error('[HANDLER] Conversation upsert failed:', msg)

      // Fallback for schemas missing UNIQUE(org_id, contact_id)
      // 1) try selecting existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, handled_by')
        .eq('org_id', orgId)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle<{ id: string; handled_by: string | null }>()

      if (existing) {
        resolvedConv = existing
      } else {
        // 2) create new conversation row (no onConflict)
        const { data: created, error: createErr } = await supabase
          .from('conversations')
          .insert({
            org_id: orgId,
            contact_id: contact.id,
            device_id: deviceId,
            status: 'active',
            handled_by: 'ai',
            last_message_at: now,
            updated_at: now,
          })
          .select('id, handled_by')
          .single<{ id: string; handled_by: string | null }>()

        if (createErr || !created) {
          console.error('[HANDLER] Conversation insert fallback failed:', createErr?.message)
          return
        }
        resolvedConv = created
      }
    }

    await supabase.from('messages').insert({
      org_id: orgId,
      conversation_id: resolvedConv.id,
      direction: 'inbound',
      sender_type: 'contact',
      sender_name: msg.pushName ?? '',
      content: text,
      message_type: 'text',
      wa_message_id: msg.key.id,
      status: 'delivered',
      metadata: {
        messageKey: msg.key,
        messageTimestamp: msg.messageTimestamp,
        deviceId,
      },
    })

    if (resolvedConv.handled_by === 'human') {
      return
    }

    const { data: memRows } = await supabase
      .from('contact_memory')
      .select('key, value')
      .eq('contact_id', contact.id)

    const memory: Record<string, unknown> = Object.fromEntries(
      (memRows ?? []).map((row) => [row.key, this.normalizeMemoryValue(row.value)]),
    )

    const { data: msgRows } = await supabase
      .from('messages')
      .select('direction, content')
      .eq('conversation_id', resolvedConv.id)
      .order('created_at', { ascending: false })
      .limit(16)

    const history = (msgRows ?? []).reverse().map((row) => ({
      role: (row.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: row.content as string,
    }))

    const { whatsAppGateway } = await import('./WhatsAppGateway.js')
    const runtimeFingerprint = buildRuntimeFingerprint(env.PORT, whatsAppGateway.getConnectedDeviceIds())

    const detectedIntent = detectPrimaryIntent(text).intent
    const isPropertyFollowUp = this.propertyFollowUpPattern.test(text)
      && (typeof memory.area === 'string' && memory.area.trim().length > 0)
    const isShortContinuation =
      this.shortContinuationPattern.test(text.trim()) ||
      text.trim().split(/\s+/).length <= 2
    const strictIntent: ReturnType<typeof detectPrimaryIntent>['intent'] =
      detectedIntent === 'general' && isPropertyFollowUp ? 'property' : detectedIntent
    const hasArabic = /[\u0600-\u06FF]/.test(text)
    const forcedLang: 'en' | 'ar' = hasArabic ? 'ar' : 'en'
    let replyResult: ReplyResult

    if (strictIntent === 'company') {
      replyResult = {
        reply: buildSpecificCompanyResponse(text, forcedLang) ?? getCompanyInfoAsString(forcedLang),
        lane: 'COMPANY',
        lang: forcedLang,
        handoff: false,
        replyMode: 'prebuilt',
        intent: {} as never,
      }
    } else if (strictIntent === 'agent') {
      const directoryKind = detectAgentDirectoryRequest(text)
      const hint = text.toLowerCase().match(/\b(hammad|waheed|laiba|sarosh|imran|anushka|asif|tanzeel|ayaz|hrithik|sarah|sumbul|muniq|sharmeen|aya)\b/)?.[1]
      const directory = directoryKind ? getDirectoryResponse(directoryKind, forcedLang) : null
      const byName = hint ? getAgentByName(hint, forcedLang) : null
      const fallback = getAgentResponse(
        forcedLang,
        typeof memory.area === 'string' ? memory.area : undefined,
        typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined,
      )
      const response = directory ?? byName ?? fallback
      replyResult = {
        reply: response.content,
        lane: 'AGENT',
        lang: forcedLang,
        handoff: false,
        replyMode: 'prebuilt',
        intent: {} as never,
        resolvedAgent: response.agent,
      }
    } else if (strictIntent === 'property') {
      const propertyDetails = extractPropertyDetails(text, memory as any)
      const sameAreaAsMemory =
        typeof memory.area === 'string' &&
        typeof propertyDetails.area === 'string' &&
        memory.area.toLowerCase() === propertyDetails.area.toLowerCase()
      const hasShownRefs =
        typeof memory.lastShownPropertyRefs === 'string' &&
        memory.lastShownPropertyRefs.trim().length > 0
      const memoryLastIntent = typeof memory.lastIntent === 'string' ? memory.lastIntent : undefined

      if (isShortContinuation && sameAreaAsMemory && hasShownRefs && memoryLastIntent === 'property') {
        replyResult = {
          reply: forcedLang === 'ar'
            ? `لقد أرسلت لك بالفعل خيارات في *${propertyDetails.area}*. هل تريد المزيد من الخيارات، ميزانية مختلفة، أم عدد غرف مختلف؟`
            : `I already shared options in *${propertyDetails.area}*. Would you like more options, a different budget, or different bedrooms?`,
          lane: 'PROPERTY',
          lang: forcedLang,
          handoff: false,
          replyMode: 'prebuilt',
          intent: {} as never,
        }
      } else
      if (!propertyDetails.area) {
        replyResult = {
          reply: forcedLang === 'ar'
            ? 'من فضلك حدّد المنطقة أولاً حتى أتحقق من العقارات المتاحة بدقة.'
            : 'Please specify a location first so I can check exact available properties.',
          lane: 'PROPERTY',
          lang: forcedLang,
          handoff: false,
          replyMode: 'prebuilt',
          intent: {} as never,
        }
      } else {
        const propertyResponse = await queryProperties({
          orgId,
          area: propertyDetails.area,
          bedrooms: propertyDetails.bedrooms,
          maxPrice: propertyDetails.maxPrice,
          minPrice: propertyDetails.minPrice,
          transactionType: propertyDetails.transactionType,
          category: propertyDetails.category,
          excludeRefs: isPropertyFollowUp && typeof memory.lastShownPropertyRefs === 'string'
            ? memory.lastShownPropertyRefs.split(',').map((v) => v.trim()).filter((v) => v.length > 0)
            : [],
        })

        if (!propertyResponse.found || !propertyResponse.properties || propertyResponse.properties.length === 0) {
          const area = propertyDetails.area
          const hadPreviousShownRefs = typeof memory.lastShownPropertyRefs === 'string' && memory.lastShownPropertyRefs.trim().length > 0
          if (isPropertyFollowUp && hadPreviousShownRefs) {
            const exhaustedReply = forcedLang === 'ar'
              ? `شاركت معك كل الخيارات المتاحة حالياً في ${area}. إذا رغبت، أقدر أوسع البحث بمعايير مختلفة (سعر/غرف/منطقة قريبة).`
              : `I have shared all currently available options in ${area}. I can broaden the search with different filters (price, bedrooms, or nearby areas).`
            replyResult = {
              reply: exhaustedReply,
              lane: 'PROPERTY',
              lang: forcedLang,
              handoff: false,
              replyMode: 'prebuilt',
              intent: {} as never,
            }
          } else {
          const budget = typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined
          const salesManager = findBestAgent(area, budget)
          const ceo = findAgentByName('imran') ?? salesManager
          const alertBase = {
            clientPhone: `+${phone}`,
            clientMessage: text,
            area,
            bedrooms: propertyDetails.bedrooms,
            transactionType: propertyDetails.transactionType,
            budget: propertyDetails.maxPrice,
            lang: forcedLang,
            orgId,
          }
          await sendAgentAlert(alertBase, salesManager).catch(() => undefined)
          await sendAgentAlert(alertBase, ceo).catch(() => undefined)

          const noResultsReply = forcedLang === 'ar'
            ? 'لا توجد عقارات متاحة في هذه المنطقة.'
            : 'No properties available in this area.'
          replyResult = {
            reply: noResultsReply,
            lane: 'PROPERTY',
            lang: forcedLang,
            handoff: false,
            replyMode: 'prebuilt',
            intent: {} as never,
            resolvedAgent: { id: salesManager.id, name: salesManager.name, phone: salesManager.phone },
          }
          }
        } else {
          const shownPropertyRefs = propertyResponse.properties
            .map((p) => p.ref_number)
            .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
          const cards = propertyResponse.properties.map((p) => {
            const price = p.price_aed
              ? `AED ${Number(p.price_aed).toLocaleString('en-AE')}`
              : (forcedLang === 'ar' ? 'السعر عند الطلب' : 'Price on request')
            const txType = p.transaction_type === 'RENT'
              ? (forcedLang === 'ar' ? 'للإيجار' : 'For Rent')
              : (forcedLang === 'ar' ? 'للبيع' : 'For Sale')
            const beds = String(p.bedrooms ?? (forcedLang === 'ar' ? 'استوديو' : 'Studio'))
            const area = String(p.district ?? (forcedLang === 'ar' ? 'دبي' : 'Dubai'))
            const building = p.building ? `${p.building}, ` : ''
            const ref = p.ref_number ? `🏷 Ref: ${p.ref_number}` : ''
            const category = String(p.category ?? (forcedLang === 'ar' ? 'عقار' : 'Property'))
            return [
              '━━━━━━━━━━━━━━━━━━',
              `🏠 *${category} — ${area}*`,
              forcedLang === 'ar' ? `📍 ${building}${area}، دبي` : `📍 ${building}${area}, Dubai`,
              forcedLang === 'ar' ? `🛏 *${beds}*` : `🛏 *${beds === 'Studio' ? 'Studio' : `${beds} Beds`}*`,
              `💰 *${price}* (${txType})`,
              ref,
              '━━━━━━━━━━━━━━━━━━',
            ].filter(Boolean).join('\n')
          }).join('\n\n')

          replyResult = {
            reply: `${cards}${forcedLang === 'ar'
              ? '\n\nهل ترغب بحجز معاينة؟'
              : '\n\nWould you like to arrange a viewing?'}`,
            lane: 'PROPERTY',
            lang: forcedLang,
            handoff: false,
            replyMode: 'prebuilt',
            intent: {} as never,
            shownPropertyRefs,
          }
        }
      }
    } else {
      replyResult = await generateReply({
        orgId,
        phoneNumber: `+${phone}`,
        message: text,
        conversationHistory: history,
        memory,
      })
    }

    const {
      reply,
      handoff,
      lang,
      lane,
      intent,
      replyMode,
      resolvedAgent,
      shownPropertyRefs,
    } = replyResult

    const safeReply = this.applyOutboundSafetyGuard({
      inboundMessage: text,
      rawReply: reply,
      lang,
      lane,
      shownPropertyRefs,
      handoff,
      memory,
    })
    const hasLocationHint = /\b(in|at|near|area|burj|marina|jvc|downtown|media city|dubai mall|business bay)\b/i.test(text)
    if (strictIntent === 'property' && (!shownPropertyRefs || shownPropertyRefs.length === 0) && (Boolean(memory.area) || hasLocationHint)) {
      const area = typeof memory.area === 'string' ? memory.area : undefined
      const budget = typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined
      const salesManager = findBestAgent(area, budget)
      const ceo = findAgentByName('imran') ?? salesManager
      const alertBase = {
        clientPhone: `+${phone}`,
        clientMessage: text,
        area,
        bedrooms: typeof memory.bedrooms === 'string' ? memory.bedrooms : undefined,
        transactionType: memory.transactionType === 'RENT'
          ? 'RENT' as const
          : memory.transactionType === 'SALE'
            ? 'SALE' as const
            : undefined,
        budget,
        lang,
        orgId,
      }
      await sendAgentAlert(alertBase, salesManager).catch(() => undefined)
      await sendAgentAlert(alertBase, ceo).catch(() => undefined)
      console.warn(JSON.stringify({
        tag: 'PROPERTY_NO_DB_MATCH_ESCALATED',
        phone: `+${phone}`,
        orgId,
        area: area ?? null,
        salesManager: salesManager.name,
        ceo: ceo.name,
      }))
    }

    console.log(JSON.stringify({
      tag: 'AYA_INBOUND',
      pipelineVersion: PIPELINE_VERSION,
      buildId: BUILD_ID,
      runtimeFingerprint,
      deviceId,
      orgId,
      phone: `+${phone}`,
      lane,
      lang,
      handoff,
      replyMode,
      area: intent.area ?? null,
      transactionType: intent.transactionType ?? null,
      maxPrice: intent.maxPrice ?? null,
      bedrooms: intent.bedrooms ?? null,
      propertiesFound: shownPropertyRefs?.length ?? 0,
      propertyRefs: shownPropertyRefs ?? [],
      responsePreview: safeReply.slice(0, 200),
    }))

    try {
      const sendResult = await whatsAppGateway.sendText({
        orgId,
        deviceId,
        jid,
        phone: `+${phone}`,
        text: safeReply,
      })

      await supabase.from('messages').insert({
        org_id: orgId,
        conversation_id: resolvedConv.id,
        direction: 'outbound',
        sender_type: 'ai',
        sender_name: 'Aya AI',
        content: safeReply,
        message_type: 'text',
        wa_message_id: sendResult.messageId,
        status: 'sent',
        metadata: {
          transport: 'baileys',
          deviceId: sendResult.deviceId,
          lane,
          lang,
          replyMode,
          propertyRefs: shownPropertyRefs ?? [],
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp transport error'
      console.error(`[HANDLER][SEND_FAILED] ${phone}: ${errorMessage}`)

      await supabase.from('messages').insert({
        org_id: orgId,
        conversation_id: resolvedConv.id,
        direction: 'outbound',
        sender_type: 'ai',
        sender_name: 'Aya AI',
        content: safeReply,
        message_type: 'text',
        status: 'failed',
        metadata: {
          transport: 'baileys',
          deviceId,
          lane,
          lang,
          replyMode,
          propertyRefs: shownPropertyRefs ?? [],
          error: errorMessage,
        },
      })
    }

    if (handoff) {
      await supabase.from('conversations').update({ handled_by: 'human' }).eq('id', resolvedConv.id)
    }

    const updates: Array<{ contact_id: string; key: string; value: string; updated_at: string }> = []
    if (intent.transactionType) updates.push({ contact_id: contact.id, key: 'transactionType', value: String(intent.transactionType), updated_at: now })
    if (intent.area) updates.push({ contact_id: contact.id, key: 'area', value: String(intent.area), updated_at: now })
    if (intent.bedrooms) updates.push({ contact_id: contact.id, key: 'bedrooms', value: String(intent.bedrooms), updated_at: now })
    if (intent.maxPrice) updates.push({ contact_id: contact.id, key: 'maxBudget', value: String(intent.maxPrice), updated_at: now })
    if (intent.category) updates.push({ contact_id: contact.id, key: 'category', value: String(intent.category), updated_at: now })
    if (lang) updates.push({ contact_id: contact.id, key: 'language', value: lang, updated_at: now })
    if (resolvedAgent?.id) updates.push({ contact_id: contact.id, key: 'assignedAgentId', value: resolvedAgent.id, updated_at: now })
    if (resolvedAgent?.name) updates.push({ contact_id: contact.id, key: 'assignedAgentName', value: resolvedAgent.name, updated_at: now })
    if (resolvedAgent?.phone) updates.push({ contact_id: contact.id, key: 'assignedAgentPhone', value: resolvedAgent.phone, updated_at: now })
    if (resolvedAgent?.name) updates.push({ contact_id: contact.id, key: 'lastAgentName', value: resolvedAgent.name, updated_at: now })
    if (resolvedAgent?.phone) updates.push({ contact_id: contact.id, key: 'lastAgentPhone', value: resolvedAgent.phone, updated_at: now })
    if (handoff) updates.push({ contact_id: contact.id, key: 'handoffTriggered', value: 'true', updated_at: now })
    updates.push({ contact_id: contact.id, key: 'lastIntent', value: lane.toLowerCase(), updated_at: now })
    if (shownPropertyRefs && shownPropertyRefs.length > 0) {
      const existingRefs = typeof memory.lastShownPropertyRefs === 'string'
        ? memory.lastShownPropertyRefs.split(',').map((v) => v.trim()).filter((v) => v.length > 0)
        : []
      const mergedRefs = Array.from(new Set([...existingRefs, ...shownPropertyRefs]))
      updates.push({
        contact_id: contact.id,
        key: 'lastShownPropertyRefs',
        value: mergedRefs.join(','),
        updated_at: now,
      })
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('contact_memory').upsert(updates, { onConflict: 'contact_id,key' })
      if (error) {
        console.warn('[MEMORY] save failed:', error.message)
      }
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: now, detected_lang: lang, updated_at: now })
      .eq('id', resolvedConv.id)
  }

  private applyOutboundSafetyGuard(params: {
    inboundMessage: string
    rawReply: string
    lang: 'en' | 'ar'
    lane: string
    shownPropertyRefs?: string[]
    handoff: boolean
    memory: Record<string, unknown>
  }): string {
    const { inboundMessage, rawReply, lang, shownPropertyRefs, memory } = params
    const strictIntent = detectPrimaryIntent(inboundMessage).intent
    const sanitized = sanitize(rawReply)

    // Hard override: company intent always returns deterministic company card.
    if (strictIntent === 'company') {
      return sanitize(getCompanyInfoAsString(lang))
    }

    // Hard block: property-like output without DB refs is unsafe.
    const propertyLikeOutput =
      /\*Property\s*\d+\*/i.test(sanitized) ||
      /Starting from AED/i.test(sanitized) ||
      /Ref:\s*[A-Za-z0-9/_-]+/i.test(sanitized)
    const hasRefs = Array.isArray(shownPropertyRefs) && shownPropertyRefs.length > 0

    if (strictIntent === 'property' && (!hasRefs || propertyLikeOutput && !hasRefs)) {
      const area = typeof memory.area === 'string' ? memory.area : undefined
      const budget = typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined
      const agent = getAgentResponse(lang, area, budget)
      const fallback = lang === 'ar'
        ? `عذراً، لا تتوفر لدينا قوائم عقارية مطابقة حالياً من قاعدة البيانات.\n\n${agent.content}`
        : `We don't currently have matching listings in our database.\n\n${agent.content}`
      return sanitize(fallback)
    }

    return sanitized
  }

  private extractText(message: WAMessage): string {
    const msg = this.unwrapMessageContent(message.message)
    return msg?.conversation ?? msg?.extendedTextMessage?.text ?? ''
  }

  private unwrapMessageContent(message: WAMessage['message']): WAMessage['message'] | null {
    let current = message

    for (let i = 0; i < 5; i += 1) {
      if (!current) return null

      const record = current as Record<string, unknown>
      const wrappers = [
        record.ephemeralMessage,
        record.viewOnceMessage,
        record.viewOnceMessageV2,
        record.viewOnceMessageV2Extension,
        record.documentWithCaptionMessage,
      ]

      const nested = wrappers.find(
        (entry): entry is { message?: WAMessage['message'] } =>
          typeof entry === 'object' && entry !== null && 'message' in entry,
      )

      if (!nested?.message) return current
      current = nested.message
    }

    return current ?? null
  }

  private normalizeMemoryValue(value: unknown): unknown {
    if (typeof value !== 'string') return value
    if (/^\d+$/.test(value)) return Number(value)
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  }
}
