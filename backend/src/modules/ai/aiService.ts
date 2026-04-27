import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { buildPrompt } from './promptBuilder.js'
import { routeMessage, type RouteResult } from './router.js'
import { routeByIntent, type DirectResponse, type QueryResponse } from './intentRouter.js'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
  )
  return Promise.race([promise, timer])
}

export function sanitize(text: string): string {
  return text
    .replace(/\[team-verified[^\]]*\]/gi, '')
    .replace(/\[team verified[^\]]*\]/gi, '')
    .replace(/\{[A-Z_]{2,}\}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\biere\.ae\b/gi, 'www.investmentexperts.ae')
    .replace(/\bwww\.iere\.ae\b/gi, 'www.investmentexperts.ae')
    .replace(/\bwww\.ieredubai\.com\b/gi, 'https://www.investmentexperts.ae')
    .replace(/\bieredubai\.com\b/gi, 'investmentexperts.ae')
    .replace(/Boulevard Plaza[^,\n]*/gi, 'Concord Tower, Dubai Media City, Dubai')
    .replace(/\+971[\s\d-]*[xX]{2,}[\d\s-]*/g, '')
    .replace(/Thanks for your patience[^.!?]*[.!?]/gi, '')
    .replace(/One of our property specialists will follow up[^.!?]*[.!?]/gi, '')
    .replace(/property specialist[s]? will follow[^.!?]*[.!?]/gi, '')
    .replace(/I'll be happy to follow up[^.!?]*[.!?]/gi, '')
    .replace(/I'll need to check with our team[^.!?]*[.!?]/gi, '')
    .replace(/I need to verify this information[^.!?]*[.!?]/gi, '')
    .replace(/Allow me a moment to check[^.!?]*[.!?]/gi, '')
    .replace(/I only speak English[^.!?]*[.!?]/gi, '')
    .replace(/\*Property\s+\d+\*/gi, '')
    .replace(/Property\s+\d+/gi, '')
    .replace(/Starting from AED\s*[\d,]+/gi, '')
    .replace(/Prices?\s+start(?:ing)?\s+around\s+AED\s*[\d,]+/gi, '')
    .replace(/Would you like me to check availability[^.!?]*[.!?]/gi, '')
    .replace(/Our office is located in Dubai\./gi, 'Our office is at Concord Tower, Dubai Media City, Dubai.')
    .replace(/For the exact address[^.!?]*[.!?]/gi, 'Our address is Concord Tower, Dubai Media City, Dubai.')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

let claude: Anthropic | null = null
let groq: Groq | null = null

function initAI(): void {
  if (!claude && process.env.ANTHROPIC_API_KEY) {
    claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
}

function contentGateCheck(reply: string, route: RouteResult): { passed: boolean; reason?: string } {
  if (/thanks for your patience/i.test(reply) || /property specialist.*follow up/i.test(reply)) {
    return { passed: false, reason: 'patience handoff text detected' }
  }
  if (/\*?\s*Property\s+\d+\s*\*?/i.test(reply) || /Starting from AED/i.test(reply) || /Prices?\s+start(?:ing)?\s+around/i.test(reply)) {
    return { passed: false, reason: 'legacy property formatter text detected' }
  }
  if (/boulevard plaza/i.test(reply)) {
    return { passed: false, reason: 'wrong office address detected' }
  }
  if (/\bieredubai\.com\b/i.test(reply) || /\biere\.ae\b/i.test(reply)) {
    return { passed: false, reason: 'wrong website detected' }
  }
  if (/i only speak english/i.test(reply) || /لا.*الإنجليزية فقط/i.test(reply)) {
    return { passed: false, reason: 'wrong language capability detected' }
  }
  if (/office is located in dubai/i.test(reply) && !/concord tower/i.test(reply)) {
    return { passed: false, reason: 'vague office address detected' }
  }
  if (/investment experts real estate,\s*dubai\b/i.test(reply) && !/concord tower/i.test(reply)) {
    return { passed: false, reason: 'vague company address detected' }
  }
  if (route.lane === 'COMPANY' && !/concord tower/i.test(reply)) {
    return { passed: false, reason: 'company reply missing exact office address' }
  }
  if (route.lane === 'COMPANY' && !/investmentexperts\.ae/i.test(reply)) {
    return { passed: false, reason: 'company reply missing verified website' }
  }
  if (route.lang === 'ar' && !/[\u0600-\u06FF]/.test(reply)) {
    return { passed: false, reason: 'Arabic client but no Arabic reply' }
  }
  if (route.lane === 'PROPERTY' && (route.propertiesFound ?? 0) === 0 && /AED\s[\d,]+/.test(reply)) {
    return { passed: false, reason: 'price mentioned despite zero property results' }
  }
  return { passed: true }
}

function buildSafeFallback(route: RouteResult): string {
  if (route.lang === 'ar') {
    return route.isReturningUser
      ? 'أنا هنا لمساعدتك. هل تبحث عن شراء أو إيجار أو استثمار في دبي؟'
      : 'مرحباً! أنا أيا من Investment Experts Real Estate. هل تبحث عن شراء أو إيجار أو استثمار في دبي؟'
  }

  return route.isReturningUser
    ? 'I am here to help. Are you looking to buy, rent, or invest in Dubai?'
    : "Hi! I'm Aya from Investment Experts Real Estate. Are you looking to buy, rent, or invest in Dubai?"
}

/**
 * Build a structured text block of property data for AI formatting.
 * AI reads this data and formats it - it does NOT invent anything.
 */
function buildPropertyContextForAI(
  properties: Record<string, unknown>[],
  lang: 'en' | 'ar',
): string {
  return properties.map((p, i) => {
    const price = p.price_aed ? `AED ${Number(p.price_aed).toLocaleString('en-AE')}` : 'Price on request'
    const txType = p.transaction_type === 'RENT' ? 'For Rent' : 'For Sale'
    const beds = p.bedrooms ?? 'Studio'
    const area = p.district ?? 'Dubai'
    const building = p.building ? `${p.building}, ` : ''
    const ref = p.ref_number ? `Ref: ${p.ref_number}` : ''
    const agent = p.agent_name ?? 'IERE Team'
    const sqft = p.size_sqft ? `${Number(p.size_sqft).toLocaleString()} sqft` : ''
    const status = p.status ? `Status: ${p.status}` : ''
    const category = p.category ?? 'Property'

    return [
      `Property ${i + 1}:`,
      `  Type: ${category}`,
      `  Location: ${building}${area}, Dubai`,
      `  Bedrooms: ${beds}`,
      sqft ? `  Size: ${sqft}` : null,
      `  Price: ${price} (${txType})`,
      status ? `  ${status}` : null,
      ref ? `  ${ref}` : null,
      `  Agent: ${agent}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}

/**
 * System prompt for AI property formatting.
 * AI ONLY formats the data given - never invents or adds prices.
 */
function buildPropertyFormattingPrompt(lang: 'en' | 'ar', count: number): string {
  const langInstruction = lang === 'ar' ? 'Reply in Arabic only.' : 'Reply in English only.'
  return `You are Aya, WhatsApp assistant for Investment Experts Real Estate, Dubai.
${langInstruction}
Use WhatsApp formatting: *bold* for labels, line breaks between fields.
You will receive ${count} verified property listing(s) from our database.
Your ONLY job is to format these listings clearly for WhatsApp.
ABSOLUTE RULES:
- Do NOT add any property that was not given to you
- Do NOT add or change any price
- Do NOT add addresses or buildings that were not given
- Do NOT add agent names that were not given
- Do NOT say "starting from" or estimate any price
- Do NOT use markdown headers (##)
- After the listings, add ONE line asking if they want to arrange a viewing
- Keep each listing card under 8 lines
- Use the separator ━━━━━━━━━━━━━━━━━━ between cards`
}

/**
 * Deterministic property formatter (used when AI fails).
 * Guaranteed to only use data from the DB - never invents anything.
 */
function formatPropertiesDirectly(
  properties: Record<string, unknown>[],
  lang: 'en' | 'ar',
): string {
  const cards = properties.map((p) => {
    const price = p.price_aed
      ? `AED ${Number(p.price_aed).toLocaleString('en-AE')}`
      : (lang === 'ar' ? 'السعر عند الطلب' : 'Price on request')
    const txType = p.transaction_type === 'RENT'
      ? (lang === 'ar' ? 'للإيجار' : 'For Rent')
      : (lang === 'ar' ? 'للبيع' : 'For Sale')
    const beds = String(p.bedrooms ?? (lang === 'ar' ? 'استوديو' : 'Studio'))
    const area = String(p.district ?? (lang === 'ar' ? 'دبي' : 'Dubai'))
    const building = p.building ? `${p.building}, ` : ''
    const ref = p.ref_number ? `🏷 Ref: ${p.ref_number}` : ''
    const agent = String(p.agent_name ?? 'IERE Team')
    const category = String(p.category ?? (lang === 'ar' ? 'عقار' : 'Property'))

    if (lang === 'ar') {
      return [
        '━━━━━━━━━━━━━━━━━━',
        `🏠 *${category} — ${area}*`,
        `📍 ${building}${area}، دبي`,
        `🛏 *${beds}*`,
        `💰 *${price}* (${txType})`,
        ref,
        `👤 ${agent}`,
        '━━━━━━━━━━━━━━━━━━',
      ].filter(Boolean).join('\n')
    }

    return [
      '━━━━━━━━━━━━━━━━━━',
      `🏠 *${category} — ${area}*`,
      `📍 ${building}${area}, Dubai`,
      `🛏 *${beds === 'Studio' ? 'Studio' : `${beds} Beds`}*`,
      `💰 *${price}* (${txType})`,
      ref,
      `👤 Agent: ${agent}`,
      '━━━━━━━━━━━━━━━━━━',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const cta = lang === 'ar'
    ? '\n\nهل تريد حجز معاينة أو مشاهدة المزيد من الخيارات؟'
    : '\n\nWould you like to arrange a viewing or see more options?'

  return `${cards}${cta}`
}

function detectHallucination(reply: string, lane: string, propertiesInDB: number): boolean {
  if (lane === 'PROPERTY' && propertiesInDB === 0) {
    if (/AED\s[\d,]+/.test(reply)) {
      console.error('[HALLUCINATION] Price detected with zero DB results!')
      return true
    }
    if (/starting from|prices? (start|from)/i.test(reply)) {
      console.error('[HALLUCINATION] Price range claim with zero DB results!')
      return true
    }
  }

  if (/\*Property \d+\*/i.test(reply)) {
    console.error('[HALLUCINATION] Legacy property numbering detected!')
    return true
  }

  return false
}

function logRoutingAssertion(event: string, details: Record<string, unknown>): void {
  console.log(JSON.stringify({
    tag: 'AI_ROUTING_ASSERT',
    event,
    ...details,
  }))
}

export interface ReplyResult {
  reply: string
  lane: RouteResult['lane']
  lang: 'en' | 'ar'
  handoff: boolean
  replyMode: 'prebuilt' | 'ai' | 'fallback'
  intent: ReturnType<typeof routeMessage> extends Promise<infer T> ? (T extends { intent: infer I } ? I : never) : never
  resolvedAgent?: RouteResult['resolvedAgent']
  shownPropertyRefs?: string[]
}

export async function generateReply(params: {
  orgId: string
  phoneNumber: string
  message: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  memory: Record<string, unknown>
  sock?: unknown
}): Promise<ReplyResult> {
  initAI()
  const { orgId, message, conversationHistory, memory } = params

  // STEP 1: Run intent-based routing FIRST
  // This handles company, agent, and property intents WITHOUT AI
  const intentRoute = await routeByIntent({
    orgId,
    message,
    phoneNumber: params.phoneNumber,
    memory,
  })
  const intentRouteType = intentRoute.type
  logRoutingAssertion('intent_route_received', {
    orgId,
    phoneNumber: params.phoneNumber,
    intentType: intentRouteType,
  })

  // COMPANY or AGENT: Return immediately, never call AI
  if (intentRoute.type === 'direct') {
    const directResponse = intentRoute as DirectResponse
    logRoutingAssertion('intent_direct_short_circuit', {
      routing: directResponse.metadata?.routing ?? 'company_handler',
      handoff: directResponse.metadata?.handoff === true,
    })
    return {
      reply: sanitize(directResponse.content),
      lane: (directResponse.metadata?.routing === 'agent_handler' ? 'AGENT' : 'COMPANY') as RouteResult['lane'],
      lang: directResponse.language as 'en' | 'ar',
      handoff: directResponse.metadata?.handoff === true,
      replyMode: 'prebuilt',
      intent: {} as never,
      resolvedAgent: directResponse.metadata?.agent as RouteResult['resolvedAgent'],
    }
  }

  // PROPERTY: Handle result or no-result, never call AI for data
  if (intentRoute.type === 'query') {
    const queryResponse = intentRoute as QueryResponse
    const lang = queryResponse.language as 'en' | 'ar'
    logRoutingAssertion('intent_query_short_circuit', {
      found: queryResponse.data.found,
      propertyCount: queryResponse.data.properties?.length ?? 0,
      language: lang,
    })

    if (!queryResponse.data.found) {
      const noResultMessage = queryResponse.data.message
      return {
        reply: sanitize(noResultMessage ?? (
          lang === 'ar'
            ? 'عذراً، لا تتوفر لدينا قوائم عقارية تطابق بحثك حالياً. يمكنني مساعدتك في البحث بمعايير مختلفة أو التواصل مع أحد مستشارينا.'
            : "We don't currently have listings matching your search. I can help you search with different criteria or connect you with one of our consultants."
        )),
        lane: 'PROPERTY',
        lang,
        handoff: false,
        replyMode: 'prebuilt',
        intent: {} as never,
      }
    }

    const properties = queryResponse.data.properties ?? []
    if (properties.length === 0) {
      logRoutingAssertion('property_no_rows_guard', {
        reason: 'found_true_but_empty_properties_array',
      })
      return {
        reply: sanitize(
          lang === 'ar'
            ? 'عذراً، لا تتوفر لدينا قوائم عقارية تطابق بحثك حالياً. يمكنني مساعدتك في البحث بمعايير مختلفة أو التواصل مع أحد مستشارينا.'
            : "We don't currently have listings matching your search. I can help you search with different criteria or connect you with one of our consultants.",
        ),
        lane: 'PROPERTY',
        lang,
        handoff: false,
        replyMode: 'prebuilt',
        intent: {} as never,
      }
    }

    const propertyContext = buildPropertyContextForAI(properties, lang)
    const systemPrompt = buildPropertyFormattingPrompt(lang, properties.length)
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: `Format these ${properties.length} properties for a WhatsApp user:\n\n${propertyContext}` },
    ]

    let reply = ''
    let usedAIFallback = false
    if (claude) {
      try {
        const res = await withTimeout(
          claude.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            system: systemPrompt,
            messages,
          }),
          12_000,
          'Claude property format',
        )
        reply = res.content.find((block) => block.type === 'text')?.text ?? ''
      } catch (error) {
        console.warn('[AI] Claude property format failed:', (error as Error).message)
      }
    }

    if (!reply.trim()) {
      reply = formatPropertiesDirectly(properties, lang)
      usedAIFallback = true
    }

    if (detectHallucination(reply, 'PROPERTY', properties.length)) {
      logRoutingAssertion('property_hallucination_blocked', {
        propertiesInDB: properties.length,
      })
      reply = formatPropertiesDirectly(properties, lang)
      usedAIFallback = true
    }

    const shownPropertyRefs = properties
      .map((p) => p.ref_number)
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)

    return {
      reply: sanitize(reply),
      lane: 'PROPERTY',
      lang,
      handoff: false,
      replyMode: usedAIFallback ? 'prebuilt' : 'ai',
      intent: {} as never,
      shownPropertyRefs,
    }
  }

  // STEP 2: For FAQ and GENERAL - use old router + AI (unchanged)
  // intentRoute.type === 'defer_to_ai' reaches here
  if (intentRouteType !== 'defer_to_ai') {
    logRoutingAssertion('legacy_router_blocked_unexpected_type', {
      unexpectedType: intentRouteType,
    })
    throw new Error(`Unexpected intent route type before legacy router: ${intentRouteType}`)
  }
  logRoutingAssertion('legacy_router_allowed', {
    reason: 'defer_to_ai',
  })
  const routed = await routeMessage({ message, orgId, memory })
  const { systemPrompt, preBuiltContent } = buildPrompt(routed, conversationHistory.length)

  if (preBuiltContent) {
    return {
      reply: sanitize(preBuiltContent),
      lane: routed.lane,
      lang: routed.lang,
      handoff: Boolean(routed.handoff),
      replyMode: 'prebuilt',
      intent: routed.intent as never,
      resolvedAgent: routed.resolvedAgent,
      shownPropertyRefs: routed.shownPropertyRefs,
    }
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversationHistory.slice(-6),
    { role: 'user', content: message },
  ]

  let reply = ''
  let activePrompt = systemPrompt
  let replyMode: ReplyResult['replyMode'] = 'ai'

  if (claude) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await withTimeout(
          claude.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: routed.lane === 'FAQ' || routed.lane === 'GENERAL' ? 280 : 180,
            system: activePrompt,
            messages,
          }),
          15_000,
          `Claude attempt ${attempt}`,
        )
        reply = res.content.find((block) => block.type === 'text')?.text ?? ''
        if (reply.trim()) {
          const gate = contentGateCheck(reply, routed)
          if (gate.passed) {
            console.log(`[AI] Claude ok (attempt ${attempt}) | lane=${routed.lane}`)
            break
          }
          console.warn(`[AI][GATE] Rejected Claude draft | lane=${routed.lane} | reason=${gate.reason}`)
          if (attempt < 3) {
            activePrompt += `\n\nCORRECTION: Your previous draft failed because ${gate.reason}. Fix it completely.`
            reply = ''
            continue
          }
          reply = ''
        }
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string }
        const isRateLimit = err?.status === 429 || (err?.message ?? '').includes('rate_limit')
        if (isRateLimit && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
          continue
        }
        console.warn(`[AI] Claude failed attempt ${attempt}: ${err?.message ?? 'unknown error'}`)
        break
      }
    }
  }

  if (!reply && groq) {
    try {
      const res = await withTimeout(
        groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: routed.lane === 'FAQ' || routed.lane === 'GENERAL' ? 280 : 180,
          messages: [{ role: 'system', content: activePrompt }, ...messages],
        }),
        12_000,
        'Groq',
      )
      reply = res.choices[0]?.message?.content ?? ''
      if (reply.trim()) {
        const gate = contentGateCheck(reply, routed)
        if (!gate.passed) {
          console.warn(`[AI][GATE] Rejected Groq draft | lane=${routed.lane} | reason=${gate.reason}`)
          reply = ''
        }
      }
    } catch (error) {
      console.error('[AI] Groq failed:', (error as Error).message)
    }
  }

  if (!reply) {
    replyMode = 'fallback'
    console.warn(`[AI][FALLBACK] Using deterministic fallback | lane=${routed.lane}`)
    reply = buildSafeFallback(routed)
  }

  return {
    reply: sanitize(reply),
    lane: routed.lane,
    lang: routed.lang,
    handoff: false,
    replyMode,
    intent: routed.intent as never,
    resolvedAgent: routed.resolvedAgent,
    shownPropertyRefs: routed.shownPropertyRefs,
  }
}
