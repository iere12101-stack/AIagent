import { createClient } from '@supabase/supabase-js'
import {
  COMPANY,
  TEAM,
  agentCard,
  findAgentByName,
  findBestAgent,
  isInternalStaff,
  type TeamMember,
} from '../../config/companyData.js'
import { HybridRAG } from '../../rag/HybridRAG.js'

export type Lane = 'AGENT' | 'PROPERTY' | 'FAQ' | 'COMPANY' | 'GENERAL' | 'CHAT'

export interface Intent {
  area?: string
  bedrooms?: string
  maxPrice?: number
  minPrice?: number
  transactionType?: 'SALE' | 'RENT'
  category?: string
  agentNameHint?: string
  intent?: 'buy' | 'rent' | 'invest' | 'unknown'
}

export interface RouteResult {
  lane: Lane
  lang: 'en' | 'ar'
  intent: Intent
  directReply?: string
  properties?: Record<string, unknown>[]
  propertiesFound?: number
  noResultReason?: 'no_listings_in_area' | 'no_listings_match' | 'filtered_out' | 'db_error'
  faqContext?: string
  handoff?: boolean
  isReturningUser?: boolean
  generalType?: 'answer' | 'smalltalk' | 'decline'
  resolvedAgent?: Pick<TeamMember, 'id' | 'name' | 'phone'>
  shownPropertyRefs?: string[]
}

const faqRag = new HybridRAG()

const AREAS: Record<string, string> = {
  'burj khalifa': 'Burj Khalifa',
  'burja khalifa': 'Burj Khalifa',
  'burj kalifa': 'Burj Khalifa',
  'burj khalfa': 'Burj Khalifa',
  downtown: 'Downtown Dubai',
  'downtown dubai': 'Downtown Dubai',
  marina: 'Dubai Marina',
  'marina duabi': 'Dubai Marina',
  'marina dubai': 'Dubai Marina',
  'duabi marina': 'Dubai Marina',
  'dubai marina': 'Dubai Marina',
  jbr: 'Jumeirah Beach Residence',
  'jumeirah beach': 'Jumeirah Beach Residence',
  jvc: 'Jumeirah Village Circle',
  'jumeirah village circle': 'Jumeirah Village Circle',
  'jumeirah village': 'Jumeirah Village Circle',
  jlt: 'Jumeirah Lake Towers',
  'jumeirah lake towers': 'Jumeirah Lake Towers',
  jvt: 'Jumeirah Village Triangle',
  'jumeirah village triangle': 'Jumeirah Village Triangle',
  'business bay': 'Business Bay',
  difc: 'DIFC',
  palm: 'Palm Jumeirah',
  'palm jumeirah': 'Palm Jumeirah',
  'dubai media city': 'Dubai Media City',
  'media city': 'Dubai Media City',
  arjan: 'Arjan',
  'motor city': 'Motor City',
  dsc: 'Dubai Sports City',
  'dubai sports city': 'Dubai Sports City',
  'damac hills': 'DAMAC Hills',
  'damac hills 2': 'DAMAC Hills 2',
  akoya: 'DAMAC Hills 2',
  'damac lagoons': 'DAMAC Lagoons',
  majan: 'Majan',
  liwan: 'Liwan',
  'silicon oasis': 'Dubai Silicon Oasis',
  dso: 'Dubai Silicon Oasis',
  meydan: 'Meydan',
  'town square': 'Town Square',
  'al furjan': 'Al Furjan',
  'discovery gardens': 'Discovery Gardens',
  'international city': 'International City',
  'dubai islands': 'Dubai Islands',
  dlrc: 'Dubai Land Residence Complex',
  dubailand: 'Dubailand',
  'al zorah': 'Al Zorah',
  aljada: 'Aljada',
  'dubai hills': 'Dubai Hills Estate',
  creek: 'Dubai Creek Harbour',
  'creek harbour': 'Dubai Creek Harbour',
  'city walk': 'City Walk',
  bluewaters: 'Bluewaters Island',
  jumeirah: 'Jumeirah',
  'arabian ranches': 'Arabian Ranches',
  'arabian ranches 3': 'Arabian Ranches 3',
  'al wasl': 'Al Wasl',
}

const STATIC_FAQ = [
  'DLD Transfer Fee: 4% of property value, paid by the buyer at transfer.',
  'Golden Visa: AED 2M+ property can qualify for a 10-year renewable residency visa.',
  'Mortgage for expats: up to 75% LTV on ready properties.',
  'Typical yields: JVC 6-8%, Dubai Marina 5-7%, Business Bay 5-6%, Downtown 4-5%.',
  'Agency fee: 2% on sales, 5% of annual rent on rentals.',
]

function parseBudget(text: string): number | undefined {
  const t = text.replace(/,/g, '').replace(/aed/gi, '').trim()
  const million = t.match(/(\d+(?:\.\d+)?)\s*(?:m|million|mn|مليون)/i)
  if (million) return Math.round(parseFloat(million[1]) * 1_000_000)
  const thousand = t.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand)/i)
  if (thousand) return Math.round(parseFloat(thousand[1]) * 1_000)
  const plain = t.match(/\b(\d{4,9})\b/)
  if (plain) return parseInt(plain[1], 10)
  return undefined
}

function detectArea(raw: string): string | undefined {
  for (const [alias, canonical] of Object.entries(AREAS)) {
    if (raw.includes(alias)) return canonical
  }
  return undefined
}

async function getFaqContext(question: string, orgId: string): Promise<string> {
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: kbRows } = await sb
      .from('knowledge_bases')
      .select('id, name')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    const faqKb = kbRows?.find((kb) => kb.name?.toLowerCase().includes('faq')) ?? kbRows?.[0]
    if (faqKb?.id) {
      const context = await faqRag.search(question, faqKb.id, orgId, 5)
      if (context.trim()) return context
    }
  } catch (error) {
    console.warn('[ROUTER][FAQ_RAG]', error)
  }

  return STATIC_FAQ.join('\n')
}

function buildCompanyReply(lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    return [
      `🏢 *${COMPANY.name}*`,
      '',
      `📍 *العنوان:* ${COMPANY.address}`,
      `📞 *الهاتف:* ${COMPANY.phone}`,
      `📧 *البريد الإلكتروني:* ${COMPANY.email}`,
      `🌐 *الموقع الإلكتروني:* ${COMPANY.website}`,
      `🗺 *خرائط Google:* ${COMPANY.maps}`,
      `⏰ *ساعات العمل:* ${COMPANY.hours}`,
    ].join('\n')
  }

  return [
    `🏢 *${COMPANY.name}*`,
    '',
    `📍 *Address:* ${COMPANY.address}`,
    `📞 *Phone:* ${COMPANY.phone}`,
    `📧 *Email:* ${COMPANY.email}`,
    `🌐 *Website:* ${COMPANY.website}`,
    `🗺 *Google Maps:* ${COMPANY.maps}`,
    `⏰ *Hours:* ${COMPANY.hours}`,
  ].join('\n')
}

function buildArabicCapabilityReply(): string {
  return 'نعم بالتأكيد! أنا أيا من Investment Experts Real Estate، وأتحدث العربية والإنجليزية بطلاقة. كيف يمكنني مساعدتك اليوم؟ هل تبحث عن عقار للشراء أو الإيجار أو الاستثمار؟'
}

function buildCompanyAgentReply(lang: 'en' | 'ar', agent: TeamMember): string {
  const company = buildCompanyReply(lang)
  const card = agentCard(agent, lang)
  if (lang === 'ar') {
    return `${company}\n\n👤 *مستشار المبيعات:*\n${card}`
  }
  return `${company}\n\n👤 *Sales Consultant:*\n${card}`
}

export async function routeMessage(params: {
  message: string
  orgId: string
  memory: Record<string, unknown>
}): Promise<RouteResult> {
  const { message, orgId, memory } = params
  const raw = message.toLowerCase().trim()
  const hasArabic = /[\u0600-\u06FF]/.test(message)
  const lang: 'en' | 'ar' = hasArabic ? 'ar' : 'en'

  const area = detectArea(raw) ?? (typeof memory.area === 'string' ? memory.area : undefined)
  const bedroomsMatch = raw.match(/\b(\d+)\s*(?:br|bed(?:room)?s?)\b/i) ?? raw.match(/\b(studio)\b/i)
  const budget = parseBudget(message)

  let maxPrice: number | undefined
  let minPrice: number | undefined
  if (/\b(max|maximum|under|below|up to|budget|أقصى|أقل|ميزانية)\b/i.test(raw)) maxPrice = budget
  else if (/\b(min|minimum|above|at least|from|starting|أكثر|فوق)\b/i.test(raw)) minPrice = budget
  else maxPrice = budget

  maxPrice ??= typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined
  minPrice ??= typeof memory.minBudget === 'number' ? memory.minBudget : undefined

  const negatesRent =
    /\b(don'?t|not|no|without|exclude|stop showing|no more)\b.*\b(rent|rental|lease)\b/i.test(raw) ||
    /\b(rent|rental|lease)\b.*\b(only|just)\b.*\b(sale|buy|purchase)\b/i.test(raw)
  const negatesBuy =
    /\b(don'?t|not|no|without|exclude|stop showing|no more)\b.*\b(buy|sale|purchase|ownership)\b/i.test(raw)

  let transactionType: 'SALE' | 'RENT' | undefined
  if (/\b(buy|purchase|buying|bought|for sale|to buy|invest|ownership|تملك|للبيع|شراء)\b/i.test(raw)) {
    transactionType = 'SALE'
  } else if (/\b(rent|rental|renting|lease|leasing|للإيجار|إيجار|أجار)\b/i.test(raw)) {
    transactionType = 'RENT'
  }
  if (negatesRent) {
    transactionType = 'SALE'
    console.log('[ROUTER] Negation detected -> forcing SALE')
  }
  if (negatesBuy) {
    transactionType = 'RENT'
    console.log('[ROUTER] Negation detected -> forcing RENT')
  }
  if (!transactionType && maxPrice && maxPrice >= 200_000) transactionType = 'SALE'
  transactionType ??= memory.transactionType as 'SALE' | 'RENT' | undefined

  const category = raw.match(/\b(penthouse|villa|townhouse|apartment|studio|flat|duplex|office)\b/i)?.[1]?.toLowerCase()
  const agentNameHintRaw = raw.match(/\b(hammad|waheed|laiba|sarosh|imran|anushka|asif|tanzeel|ceo|ayaz|hrithik|sarah)\b/i)?.[1]
  const agentNameHint = agentNameHintRaw?.toLowerCase() === 'ceo' ? 'imran' : agentNameHintRaw

  const intent: Intent = {
    area,
    bedrooms: bedroomsMatch?.[1]?.toLowerCase() === 'studio' ? 'Studio' : bedroomsMatch?.[1],
    maxPrice,
    minPrice,
    transactionType,
    category,
    agentNameHint,
    intent: transactionType === 'SALE' ? 'buy' : transactionType === 'RENT' ? 'rent' : 'unknown',
  }

  const isFrustrated =
    /\b(useless|terrible|awful|disgusting|pathetic|worst|rubbish|scam|waste|fraudulent|fraud|cheating|lawsuit|legal action)\b/i.test(raw) ||
    /\b(speak to human|speak to agent|real person|talk to manager|call manager|your manager|i want a human|get me a human)\b/i.test(raw) ||
    /\b(انتهى صبري|عديم الفائدة|أريد موظف|تكلم إنسان|مدير|شكوى)\b/i.test(raw)

  if (isFrustrated) {
    const agent = findBestAgent(area, maxPrice)
    return {
      lane: 'AGENT',
      lang,
      intent,
      directReply: lang === 'ar'
        ? `أفهمك تماماً 🙏 دعني أربطك بمستشارنا مباشرة:\n\n${agentCard(agent, 'ar')}`
        : `I completely understand 🙏 Let me connect you with our specialist right now:\n\n${agentCard(agent, 'en')}`,
      handoff: true,
      resolvedAgent: { id: agent.id, name: agent.name, phone: agent.phone },
    }
  }

  const hasCompanyTerms =
    /\b(office|address|location|where is your office|where are you|website|email|phone|number|company|contact details|contact info|contact information|office address|office number|company website|company phone|company address|current locations?)\b/i.test(raw) ||
    /\b(send|share|give|provide)\b.*\b(address|location|office|website|email|phone|number|details|info)\b/i.test(raw) ||
    /\b(عنوان|موقع|مكتب|تفاصيل الشركة|معلومات الشركة|رقم الشركة|البريد الإلكتروني|الموقع الإلكتروني)\b/i.test(raw)

  const hasAgentTerms =
    /\b(agent|consultant|specialist|sales manager|ceo|broker|advisor|meet|meeting|appointment|human|person|contact agent|agent contact|agent number|whatsapp)\b/i.test(raw) ||
    /\b(وكيل|مستشار|موعد|رقم الوكيل|تواصل مع مستشار)\b/i.test(raw) ||
    Boolean(agentNameHint)

  if (hasCompanyTerms && hasAgentTerms) {
    const best = findBestAgent(area, maxPrice)
    console.log('[ROUTER] lane=COMPANY mixed_company_agent=true')
    return {
      lane: 'COMPANY',
      lang,
      intent,
      directReply: buildCompanyAgentReply(lang, best),
      resolvedAgent: { id: best.id, name: best.name, phone: best.phone },
    }
  }

  if (hasCompanyTerms) {
    console.log('[ROUTER] lane=COMPANY')
    return {
      lane: 'COMPANY',
      lang,
      intent,
      directReply: buildCompanyReply(lang),
    }
  }

  if (hasAgentTerms) {
    const internalMention = raw.match(/\b(ayaz|hrithik|sarah|maysoon|sumbul)\b/i)?.[1]
    if (internalMention && isInternalStaff(internalMention)) {
      const internalMember = (TEAM as unknown as TeamMember[]).find((member) =>
        member.name.toLowerCase().includes(internalMention.toLowerCase()),
      )
      const hammad = findBestAgent(area, maxPrice)
      return {
        lane: 'AGENT',
        lang,
        intent,
        directReply: lang === 'ar'
          ? `${internalMember?.name ?? internalMention} هو ${internalMember?.role ?? 'عضو في فريقنا الداخلي'} وغير مخصص لاستشارات العملاء.\n\nدعني أربطك بفريق المبيعات:\n\n${agentCard(hammad, 'ar')}`
          : `${internalMember?.name ?? internalMention} is our ${internalMember?.role ?? 'internal team member'} and is not client-facing.\n\nLet me connect you with our sales team instead:\n\n${agentCard(hammad, 'en')}`,
        resolvedAgent: { id: hammad.id, name: hammad.name, phone: hammad.phone },
      }
    }

    if (agentNameHint) {
      const agent = findAgentByName(agentNameHint)
      if (agent) {
        return {
          lane: 'AGENT',
          lang,
          intent,
          directReply: lang === 'ar'
            ? `إليك تفاصيل ${agent.name}\n\n${agentCard(agent, 'ar')}`
            : `Here are ${agent.name}'s details:\n\n${agentCard(agent, 'en')}`,
          resolvedAgent: { id: agent.id, name: agent.name, phone: agent.phone },
        }
      }
    }

    const best = findBestAgent(area, maxPrice)
    return {
      lane: 'AGENT',
      lang,
      intent,
      directReply: lang === 'ar'
        ? `يسعدني أن أوصلك بأحد مستشارينا:\n\n${agentCard(best, 'ar')}`
        : `Happy to connect you with one of our consultants:\n\n${agentCard(best, 'en')}`,
      resolvedAgent: { id: best.id, name: best.name, phone: best.phone },
    }
  }

  const isGreeting =
    raw.length < 40 &&
    /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|سلام|مرحبا|أهلا|هلا|هاي|مساء الخير|صباح الخير)\b/i.test(raw)

  const hasPropertyAction = /\b(show|find|search|available|list|check|display)\b/i.test(raw)
  const hasPropertyNoun = /\b(property|properties|apartment|villa|townhouse|penthouse|studio|flat|duplex|unit|listing)\b/i.test(raw)
  const hasPropertyTransaction = /\b(buy|rent|purchase|for sale|for rent|lease|للبيع|للإيجار|شراء|إيجار)\b/i.test(raw)
  const hasAreaOrPrice = Boolean(area) || Boolean(budget) || Boolean(bedroomsMatch)

  // STRICT: requires noun OR (action + area/price) OR transaction type
  const isPropertyLane =
    !isGreeting &&
    (
      hasPropertyNoun ||
      hasPropertyTransaction ||
      (hasPropertyAction && hasAreaOrPrice)
    )

  if (isPropertyLane) {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let query = sb
      .from('properties')
      .select('*')
      .eq('org_id', orgId)
      .eq('available', true)
      .order('price_aed', { ascending: true })
      .limit(3)

    if (area) query = query.or(`district.ilike.%${area}%,building.ilike.%${area}%`)
    if (intent.bedrooms) {
      query = intent.bedrooms.toLowerCase() === 'studio'
        ? query.or('bedrooms.ilike.%studio%,bedrooms.eq.0')
        : query.eq('bedrooms', intent.bedrooms)
    }
    if (transactionType) query = query.eq('transaction_type', transactionType)
    if (maxPrice) query = query.lte('price_aed', maxPrice)
    if (minPrice) query = query.gte('price_aed', minPrice)
    if (category) query = query.ilike('category', `%${category}%`)

    console.log(JSON.stringify({
      tag: 'PROPERTY_QUERY',
      area,
      transactionType,
      bedrooms: intent.bedrooms,
      maxPrice,
      minPrice,
      category,
    }))

    const { data, error } = await query
    if (error) {
      console.error('[ROUTER][PROPERTY_DB_ERROR]', error.message)
      return {
        lane: 'PROPERTY',
        lang,
        intent,
        propertiesFound: 0,
        noResultReason: 'db_error',
      }
    }

    const properties = (data ?? []) as Record<string, unknown>[]
    if (properties.length === 0) {
      let noResultReason: RouteResult['noResultReason'] = 'no_listings_match'
      if (area) {
        const areaCheck = await sb
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .or(`district.ilike.%${area}%,building.ilike.%${area}%`)
        noResultReason = (areaCheck.count ?? 0) > 0 ? 'filtered_out' : 'no_listings_in_area'
      }

      console.log(JSON.stringify({
        tag: 'PROPERTY_QUERY_RESULT',
        area,
        count: 0,
        noResultReason,
      }))

      return {
        lane: 'PROPERTY',
        lang,
        intent,
        propertiesFound: 0,
        noResultReason,
      }
    }

    const shownPropertyRefs = properties
      .map((property) => property.ref_number)
      .filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0)

    console.log(JSON.stringify({
      tag: 'PROPERTY_QUERY_RESULT',
      area,
      count: properties.length,
      refs: shownPropertyRefs,
    }))

    return {
      lane: 'PROPERTY',
      lang,
      intent,
      propertiesFound: properties.length,
      properties,
      shownPropertyRefs,
    }
  }

  const isFAQLane =
    /\b(dld|dld fee|transfer fee|registration fee|mortgage|loan|finance|ltv|down payment|golden visa|investor visa|residency visa|roi|return on investment|rental yield|gross yield|net yield|ejari|dewa|utilities|service charge|maintenance fee|community fee|off.?plan|handover|payment plan|installment|oqood|title deed|freehold|leasehold|rera|dubai land department|best area|which area|recommend area)\b/i.test(raw) ||
    /\b(رهن|رسوم|تأشيرة ذهبية|عائد|استثمار|أفضل منطقة|خطة دفع)\b/i.test(raw)

  if (isFAQLane) {
    return {
      lane: 'FAQ',
      lang,
      intent,
      faqContext: await getFaqContext(message, orgId),
    }
  }

  const wantsArabic =
    /\b(can you speak arabic|do you speak arabic|speak arabic|arabic please)\b/i.test(raw)
  if (wantsArabic) {
    return {
      lane: 'GENERAL',
      lang: 'ar',
      intent,
      directReply: buildArabicCapabilityReply(),
      generalType: 'answer',
      isReturningUser: Object.keys(memory).length > 0,
    }
  }

  const isSmallTalk =
    /\b(how are you|you okay|you good|how's it going|tell me a joke|be funny|something funny|make me laugh)\b/i.test(raw)
  if (isSmallTalk) {
    return {
      lane: 'GENERAL',
      lang,
      intent,
      generalType: 'smalltalk',
      isReturningUser: Object.keys(memory).length > 0,
    }
  }

  const isDeclineGeneral =
    /\b(write (an )?essay|do my homework|complete my assignment|write code|build me malware|hack|medical diagnosis|legal advice)\b/i.test(raw)
  if (isDeclineGeneral) {
    return {
      lane: 'GENERAL',
      lang,
      intent,
      generalType: 'decline',
      isReturningUser: Object.keys(memory).length > 0,
    }
  }

  const isGeneralLane =
    /\b(what is|who is|when is|where is|why is|how does|difference between|versus|vs\b|weather|news|crypto|bitcoin|blockchain|stock|economy)\b/i.test(raw)

  if (isGeneralLane) {
    return {
      lane: 'GENERAL',
      lang,
      intent,
      generalType: 'answer',
      isReturningUser: Object.keys(memory).length > 0,
    }
  }

  return {
    lane: 'CHAT',
    lang,
    intent,
    isReturningUser: Object.keys(memory).length > 0,
  }
}
