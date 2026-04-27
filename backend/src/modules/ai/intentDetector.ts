import type { ContactMemory } from '../contacts/contactMemory.js'

/**
 * STRICT INTENT DETECTION - PRIMARY ROUTING LAYER
 * 
 * This ensures correct intent classification BEFORE calling router/AI
 * Priority: company > agent > property > faq > general
 */
export type DetectedIntent = 'company' | 'agent' | 'property' | 'faq' | 'general'

export interface PropertyIntent {
  shouldSearch: boolean
  area?: string
  bedrooms?: string
  maxPrice?: number
  minPrice?: number
  transactionType?: 'SALE' | 'RENT'
  category?: string
}

export interface AgentRequest {
  isAgentRequest: boolean
  agentName?: string
  wantsContactNumber: boolean
}

export interface DetectionResult {
  intent: DetectedIntent
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export function detectIntent(message: string): DetectedIntent {
  return detectPrimaryIntent(message).intent
}

const SHOW_NOW_TRIGGERS = [
  'show me', 'show option', 'show all', 'what do you have',
  'looking for', 'i want', 'i need', 'find me', 'search for', 'any property',
  'available properties', 'properties in', 'apartments in', 'villas in',
  'penthouse', 'studio', 'any option', 'more option',
  'عندكم', 'أبغى', 'أريد', 'ابحث', 'اريد', 'عرض', 'خيارات', 'عقارات',
]

/**
 * COMPANY INTENT DETECTION
 * Matches: "send me office address", "what is your address", "company phone", "office location"
 * Does NOT match: "address in area", "office in burj khalifa" (those are property searches)
 */
export function detectCompanyIntent(message: string): DetectionResult {
  const lower = message.toLowerCase().trim()

  // GUARD: If message is clearly a property search, reject company
  // Prevents "Show me properties in Marina address" from triggering company
  if (/\b(property|properties|apartment|villa|studio|bedroom|for sale|for rent|listings?)\b/i.test(lower)) {
    return { intent: 'general', confidence: 'low', reason: 'property keywords override company check' }
  }

  // GUARD: If the message is clearly asking for an agent/contact person,
  // do not classify it as company.
  if (
    /\b(agent|consultant|specialist|sales?\s*team|sales?\s*manager|ceo|broker|advisor|human|manager)\b/i.test(lower) ||
    /\b(وكيل|مستشار|فريق المبيعات|مدير المبيعات|المدير التنفيذي)\b/i.test(lower)
  ) {
    return { intent: 'general', confidence: 'low', reason: 'agent keywords override company check' }
  }

  // Rule 1: "(send/share/give/provide) + (address/office/location/details)"
  if (/\b(send|share|give|provide)\b.*\b(address|office|location|contact|details|info)\b/i.test(lower)) {
    return { intent: 'company', confidence: 'high', reason: 'request verb + company info' }
  }

  // Rule 2: "what/where/how + (is your) + (address/office/phone/website/email/hours)"
  if (/\b(what|where|how)\b.*\b(address|office|phone|website|email|hours|location|contact)\b/i.test(lower)) {
    return { intent: 'company', confidence: 'high', reason: 'company question pattern' }
  }

  // Rule 3: "(your/our) + (office/address/phone/website/email/location)"
  if (/\b(your|our)\b.*\b(office|address|location|phone|website|email|hours|contact)\b/i.test(lower)) {
    return { intent: 'company', confidence: 'high', reason: 'possessive + company noun' }
  }

  // Rule 3B: owner / founder / CEO questions about the company
  if (
    /\b(owner|founder|ceo)\b/i.test(lower) &&
    /\b(company|your company|investment experts|iere)\b/i.test(lower)
  ) {
    return { intent: 'company', confidence: 'high', reason: 'specific company leadership question' }
  }

  // Rule 4: "current address", "current location", "exact address"
  if (/\b(current|exact|full|complete)\b.*\b(address|location|office)\b/i.test(lower)) {
    return { intent: 'company', confidence: 'high', reason: 'descriptive + company info' }
  }

  // Rule 5: Arabic company terms
  if (/\b(عنوان|موقع|مكتب|تفاصيل|رقم|البريد|الموقع|ساعات)\b/i.test(lower)) {
    return { intent: 'company', confidence: 'high', reason: 'arabic company terms' }
  }

  // Rule 6: Single keyword "address" at start/end (but NOT "address in area")
  if ((/^(address|office|location|phone|website|email|hours|contact)$/i.test(lower) ||
       /^(address|office|location|phone|website|email|hours|contact)\s/i.test(lower)) &&
      !/\b(in|at|near|around)\s+(area|burj|marina|jvc|downtown)/i.test(lower)) {
    return { intent: 'company', confidence: 'medium', reason: 'standalone company term' }
  }

  return { intent: 'general', confidence: 'low', reason: 'not a company request' }
}

/**
 * AGENT REQUEST DETECTION
 * Matches: "contact agent", "speak to consultant", "get specialist", agent names, frustration
 */
export function detectAgentIntentFromMessage(message: string): DetectionResult {
  const lower = message.toLowerCase()
  const salesTeamPattern = /s(?:ale|ales)\s*team/i
  const salesManagerPattern = /sales?\s*manager/i

  // Rule 1: Contact action + agent terms
  if (/\b(contact|call|speak|talk|connect|meet|appointment|reach|send)\b.*\b(agent|consultant|specialist|manager|human|person|team|ceo)\b/i.test(lower) ||
      /\b(agent|consultant|specialist|manager|human|person|team|ceo)\b.*\b(contact|call|speak|talk|connect|meet|appointment|reach|send)\b/i.test(lower) ||
      (salesTeamPattern.test(lower) && /\b(contact|call|speak|talk|connect|meet|appointment|reach|send|number|phone|whatsapp)\b/i.test(lower)) ||
      (salesManagerPattern.test(lower) && /\b(contact|call|speak|talk|connect|meet|appointment|reach|send|number|phone|whatsapp)\b/i.test(lower))) {
    return { intent: 'agent', confidence: 'high', reason: 'agent request verb + noun' }
  }

  // Rule 2: Agent names explicitly mentioned
  const agentNames = /\b(hammad|waheed|laiba|sarosh|imran|anushka|asif|tanzeel|ceo|ayaz|hrithik|sarah|sumbul|muniq|sharmeen|aya)\b/i
  if (agentNames.test(lower)) {
    return { intent: 'agent', confidence: 'high', reason: 'agent name mentioned' }
  }

  // Rule 3: "Get human/person", "want to talk to real person", "speak to manager"
  if (/\b(want|need|get|require|like)\b.*\b(human|person|real|manager|staff|employee)\b/i.test(lower)) {
    return { intent: 'agent', confidence: 'high', reason: 'human/manager request' }
  }

  // Rule 4: Frustration → escalate to agent
  if (/\b(useless|terrible|awful|pathetic|worst|rubbish|scam|fraud|cheating|lawsuit|legal action|speak to human|real person|call manager|انتهى صبري|أريد موظف)\b/i.test(lower)) {
    return { intent: 'agent', confidence: 'high', reason: 'frustration detected' }
  }

  // Rule 5: "Get agent number", "agent contact", "agent phone"
  if (/\b(agent|consultant|specialist)\b.*\b(number|phone|contact|whatsapp|call)\b/i.test(lower) ||
      /\b(ceo|sales?\s*manager|s(?:ale|ales)\s*team)\b.*\b(number|phone|contact|whatsapp|call)\b/i.test(lower)) {
    return { intent: 'agent', confidence: 'high', reason: 'agent contact request' }
  }

  // Rule 6: Arabic agent terms
  if (/\b(وكيل|مستشار|موعد|رقم|تواصل|اتصل|استشارة)\b/i.test(lower)) {
    return { intent: 'agent', confidence: 'high', reason: 'arabic agent terms' }
  }

  return { intent: 'general', confidence: 'low', reason: 'not an agent request' }
}

/**
 * PROPERTY SEARCH DETECTION
 * Matches: property keywords AND (action verbs OR area OR budget OR bedrooms)
 * 
 * Important: Must avoid false positives like:
 * - "send office address" (this is COMPANY, not property)
 * - "address in burj khalifa" (this is still COMPANY if asking for our address)
 */
export function detectPropertySearchIntent(message: string): DetectionResult {
  const lower = message.toLowerCase()

  // Rule 1: Property action verbs
  if (/\b(show|find|search|looking for|want|need|available|list|check|display|give me|show me)\b.*\b(property|properties|apartment|villa|townhouse|studio|bedroom|listing)\b/i.test(lower)) {
    return { intent: 'property', confidence: 'high', reason: 'property action + type' }
  }

  // Rule 2: Property types (apartment, villa, studio, etc)
  if (/\b(apartment|villa|townhouse|penthouse|studio|flat|duplex|office space|unit)\b/i.test(lower)) {
    return { intent: 'property', confidence: 'high', reason: 'property type mentioned' }
  }

  // Rule 3: Transaction terms (buy, rent, sale, lease)
  if (/\b(buy|rent|lease|purchase|for sale|for rent|investment property|rental property|بشراء|بالإيجار|شراء|إيجار)\b/i.test(lower)) {
    return { intent: 'property', confidence: 'high', reason: 'transaction term detected' }
  }

  // Rule 4: Area names indicate property search
  // But exclude "address in area" (company) patterns
  if (!/\b(address|office|location|phone|website|email|hours|contact)\b/i.test(lower)) {
    const areaPattern = /\b(burj khalifa|marina|jvc|downtown|jbr|jlt|business bay|palm|arjan|damac|silicon oasis|creek|dubai hills|al furjan|city walk|blue waters|jumeirah|arabian ranches|palm jumeirah|motor city|deira|bur dubai|dso|motor|sports city|meydan|town square|aljada|discovery gardens|media city|dubai media city|dubai mall)\b/i
    if (areaPattern.test(lower)) {
      return { intent: 'property', confidence: 'high', reason: 'area name mentioned for property search' }
    }
  }

  // Rule 5: Budget/price mentions
  if (/\b(\d+\s*(million|k|aed|m)\b|\d{6,})\b/i.test(lower)) {
    return { intent: 'property', confidence: 'medium', reason: 'price/budget mentioned' }
  }

  // Rule 6: Bedroom mentions
  if (/\b(\d+\s*(br|bed|bedroom|bedrooms)|studio)\b/i.test(lower)) {
    return { intent: 'property', confidence: 'high', reason: 'bedroom/studio mentioned' }
  }

  // Rule 7: SHOW_NOW_TRIGGERS
  if (SHOW_NOW_TRIGGERS.some(trigger => lower.includes(trigger))) {
    return { intent: 'property', confidence: 'medium', reason: 'property trigger phrase' }
  }

  return { intent: 'general', confidence: 'low', reason: 'not a property search' }
}

/**
 * FAQ DETECTION
 * Matches: Real estate knowledge questions (DLD, mortgage, ROI, etc)
 */
export function detectFaqIntent(message: string): DetectionResult {
  const lower = message.toLowerCase()
  const faqTerms = /\b(dld|transfer fee|mortgage|loan|finance|ltv|down payment|golden visa|investor visa|residency visa|roi|return on investment|rental yield|gross yield|net yield|ejari|dewa|utilities|service charge|maintenance fee|off.?plan|handover|payment plan|installment|oqood|title deed|freehold|leasehold|rera|dubai land|best area|which area|which is best|recommend|recommended area)\b/i

  // Must have FAQ term AND question pattern
  if (faqTerms.test(lower) && /\b(what|how|why|which|when|where|is|does|can|should|will)\b/i.test(lower)) {
    return { intent: 'faq', confidence: 'high', reason: 'FAQ question detected' }
  }

  // FAQ term alone (weaker match)
  if (faqTerms.test(lower)) {
    return { intent: 'faq', confidence: 'medium', reason: 'FAQ term detected' }
  }

  return { intent: 'general', confidence: 'low', reason: 'not an FAQ question' }
}

/**
 * MASTER INTENT DETECTION
 * Uses priority: company > agent > property > faq > general
 */
export function detectPrimaryIntent(message: string): DetectionResult {
  // Check in priority order
  const agent = detectAgentIntentFromMessage(message)
  if (agent.confidence !== 'low') {
    return agent
  }

  const company = detectCompanyIntent(message)
  if (company.confidence !== 'low') {
    return company
  }

  const property = detectPropertySearchIntent(message)
  if (property.confidence !== 'low') {
    return property
  }

  const faq = detectFaqIntent(message)
  if (faq.confidence !== 'low') {
    return faq
  }

  return { intent: 'general', confidence: 'low', reason: 'default to general' }
}

export function parseBudget(text: string): number | undefined {
  const t = text.replace(/,/g, '').replace(/aed/gi, '').trim()
  const million = t.match(/(\d+(?:\.\d+)?)\s*m(?:illion)?/i)
  if (million) return Math.round(parseFloat(million[1]) * 1_000_000)
  const thousand = t.match(/(\d+(?:\.\d+)?)\s*k(?:ilo|thousand)?/i)
  if (thousand) return Math.round(parseFloat(thousand[1]) * 1_000)
  const plain = t.match(/\b(\d{5,9})\b/)
  if (plain) return parseInt(plain[1], 10)
  const small = t.match(/\b(\d{4})\b/)
  if (small) return parseInt(small[1], 10)
  return undefined
}

/**
 * Extract property search details from message
 * Used when detectPropertySearchIntent returns 'property' intent
 */
export function extractPropertyDetails(message: string, memory: ContactMemory): PropertyIntent {
  const lower = message.toLowerCase()

  const transMatch = lower.match(/\b(rent|buy|sale|purchase)\b/)
  const negatesRent = /\b(not (rent|renting|rental)|don'?t want (to )?rent|no (rent|rental)|want (to buy|purchase) not rent|buy.*not.*rent)\b/i.test(lower)
  const negatesBuy = /\b(not (buy|buying|for sale)|don'?t want (to )?buy|no (sale|purchase)|rent.*not.*buy)\b/i.test(lower)

  let resolvedTransactionType: 'SALE' | 'RENT' | undefined
  if (negatesRent) {
    resolvedTransactionType = 'SALE'
  } else if (negatesBuy) {
    resolvedTransactionType = 'RENT'
  } else if (transMatch) {
    resolvedTransactionType = transMatch[1] === 'rent' ? 'RENT' : 'SALE'
  } else {
    resolvedTransactionType = memory.transactionType
  }

  const categoryMatch = lower.match(/\b(penthouse|villa|townhouse|apartment|studio|duplex|flat|office)\b/i)
  const category = categoryMatch?.[1]?.toLowerCase()
  const bedsMatch = message.match(/\b(\d+)\s*(?:br|bed|bedroom)\b/i) ?? message.match(/\b(studio)\b/i)
  const bedrooms = bedsMatch?.[1] ?? (typeof memory.bedrooms === 'string' ? memory.bedrooms : undefined)
  const parsedBudget = parseBudget(message)
  const maxPrice = parsedBudget ?? (typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined)

  // Extract area if present
  const areaPattern = /\b(burj khalifa|marina|jvc|downtown|jbr|jlt|business bay|palm|arjan|damac|silicon oasis|creek|dubai hills|al furjan|city walk|blue waters|jumeirah|arabian ranches|palm jumeirah|motor city|deira|bur dubai|dso|motor|sports city|meydan|town square|aljada|discovery gardens|media city|dubai media city|dubai mall)\b/i
  const areaMatch = message.match(areaPattern)
  const area = areaMatch?.[1] ?? (typeof memory.area === 'string' ? memory.area : undefined)

  return {
    shouldSearch: true,
    transactionType: resolvedTransactionType,
    category,
    bedrooms: bedrooms ?? undefined,
    maxPrice,
    area,
  }
}

/**
 * LEGACY: detectPropertyIntent for backward compatibility
 * Use detectPropertySearchIntent + extractPropertyDetails instead
 */
export function detectPropertyIntent(message: string, memory: ContactMemory): PropertyIntent {
  // Check if it's actually a property search
  const detection = detectPropertySearchIntent(message)
  if (detection.confidence === 'low') {
    return { shouldSearch: false }
  }

  return extractPropertyDetails(message, memory)
}

/**
 * LEGACY: detectAgentRequest for backward compatibility
 * Use detectAgentIntentFromMessage instead
 */
export function detectAgentRequest(message: string): AgentRequest {
  const detection = detectAgentIntentFromMessage(message)
  const lower = message.toLowerCase()
  const wantsContact = /\b(number|contact|phone|whatsapp|call|reach|رقم|هاتف|تواصل)\b/.test(lower)
  const agentNames = ['sarah', 'laiba', 'waheed', 'sarosh', 'imran', 'muhammad', 'hammad', 'ayaz']
  const mentionedAgent = agentNames.find((name) => lower.includes(name))

  return {
    isAgentRequest: detection.confidence !== 'low',
    agentName: mentionedAgent,
    wantsContactNumber: wantsContact,
  }
}
