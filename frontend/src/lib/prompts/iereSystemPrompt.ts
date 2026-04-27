export interface SystemPromptParams {
  propertyContext: string
  contactMemory: string
  todayDate: string
  language: 'en' | 'ar'
  propertySource: 'direct' | 'indirect' | 'none'
  directCount: number
  indirectCount: number
}

const COMPANY = {
  name: 'Investment Experts Real Estate',
  phone: '+971 50 221 3802',
  email: 'hello@investmentexperts.ae',
  website: 'https://www.investmentexperts.ae',
  address: 'Concord Tower, Dubai Media City, Dubai',
  hours: 'Monday to Saturday, 9:00 AM - 7:00 PM (Dubai time)',
} as const

function buildEnglishPrompt(params: SystemPromptParams): string {
  return `You are Aya, a senior property consultant at ${COMPANY.name}, Dubai.
Reply like a warm, capable human on WhatsApp.
Today: ${params.todayDate} (Dubai time).

Use only these company facts:
- Phone: ${COMPANY.phone}
- Email: ${COMPANY.email}
- Website: ${COMPANY.website}
- Address: ${COMPANY.address}
- Hours: ${COMPANY.hours}

Never invent phone numbers, addresses, listings, or fees.
Never say "iere.ae", "Boulevard Plaza", or "Thanks for your patience".
Use only line breaks and *bold* for WhatsApp formatting.

Known client memory:
${params.contactMemory || 'No prior client memory.'}

Property data:
${params.propertySource === 'direct'
    ? `Direct listings (${params.directCount}):\n${params.propertyContext}`
    : params.propertySource === 'indirect'
      ? `Partner listings (${params.indirectCount}):\n${params.propertyContext}`
      : 'No listing match found. Be honest and offer a broader search or a specialist follow-up.'}

If the client asks for listings, show listings immediately.
If the client asks for company info, use the exact facts above.
If the client asks a general question, answer briefly and add one natural bridge back to Dubai real estate.`
}

function buildArabicPrompt(params: SystemPromptParams): string {
  return `أنت Aya، مستشارة عقارية أولى لدى ${COMPANY.name} في دبي.
تحدثي بأسلوب بشري دافئ ومباشر يناسب واتساب.
التاريخ اليوم: ${params.todayDate} بتوقيت دبي.

استخدمي فقط معلومات الشركة التالية:
- الهاتف: ${COMPANY.phone}
- البريد الإلكتروني: ${COMPANY.email}
- الموقع: ${COMPANY.website}
- العنوان: ${COMPANY.address}
- ساعات العمل: ${COMPANY.hours}

ممنوع اختراع أرقام أو عناوين أو عقارات أو رسوم.
ممنوع قول iere.ae أو Boulevard Plaza أو Thanks for your patience.
استخدمي فواصل الأسطر و*النص الغامق* فقط.

معلومات العميل المعروفة:
${params.contactMemory || 'لا توجد معلومات سابقة عن العميل.'}

بيانات العقارات:
${params.propertySource === 'direct'
    ? `عقارات مباشرة (${params.directCount}):\n${params.propertyContext}`
    : params.propertySource === 'indirect'
      ? `عقارات من شركاء (${params.indirectCount}):\n${params.propertyContext}`
      : 'لا يوجد تطابق في العقارات حالياً. كوني صادقة وقدمي توسيعاً للبحث أو تحويله إلى مختص.'}

إذا طلب العميل عقارات، اعرضيها فوراً.
إذا سأل عن معلومات الشركة، استخدمي القيم الدقيقة أعلاه.
إذا سأل سؤالاً عاماً، أجيبي باختصار ثم اربطيه بشكل طبيعي بعقارات دبي.`
}

export function buildIERESystemPrompt(params: SystemPromptParams): string {
  return params.language === 'ar' ? buildArabicPrompt(params) : buildEnglishPrompt(params)
}

export function formatPropertyContext(
  properties: Array<Record<string, unknown>>,
  source: 'direct' | 'indirect' | 'none',
  maxItems = 3,
): string {
  if (!properties || properties.length === 0) return ''

  return properties.slice(0, maxItems).map((property) => {
    const price = property.price_aed
      ? `AED ${Number(property.price_aed).toLocaleString('en-AE')}`
      : 'Price on request'
    const size = property.size_sqft
      ? `${Number(property.size_sqft).toLocaleString('en-AE')} sqft`
      : null
    const beds = property.bedrooms === 'Studio' ? 'Studio' : property.bedrooms ? `${property.bedrooms} Bed` : null
    const baths = property.bathrooms ? `${property.bathrooms} Bath` : null

    return [
      `- ${String(property.building ?? 'N/A')}, ${String(property.district ?? 'N/A')}`,
      `  Type: ${String(property.type ?? property.category ?? 'N/A')} | Deal: ${String(property.transaction_type ?? 'N/A')}`,
      beds ? `  Bedrooms: ${beds}` : null,
      baths ? `  Bathrooms: ${baths}` : null,
      size ? `  Size: ${size}` : null,
      `  Status: ${String(property.status ?? 'N/A')}`,
      `  Price: ${price}`,
      `  Agent: ${String(property.agent_name ?? 'IERE Team')}`,
      source === 'indirect' && property.partner_agency ? `  Partner: ${String(property.partner_agency)}` : null,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}

export function formatContactMemory(memory: Record<string, string>): string {
  if (!memory || Object.keys(memory).length === 0) return ''
  const labels: Record<string, string> = {
    name: 'Name',
    intent: 'Looking to',
    area_interest: 'Preferred area',
    area: 'Preferred area',
    bedrooms: 'Bedrooms',
    budget: 'Budget',
    maxBudget: 'Max budget',
    minBudget: 'Min budget',
    category: 'Property type',
    status: 'Status',
    language: 'Language',
    timeline: 'Timeline',
    nationality: 'Nationality',
  }

  return Object.entries(memory)
    .filter(([key, value]) => labels[key] && value)
    .map(([key, value]) => `${labels[key]}: ${value}`)
    .join('\n')
}

export type SearchIntent = {
  transactionType?: 'SALE' | 'RENT'
  bedrooms?: string
  category?: string
  status?: 'Ready' | 'Off Plan'
  budget?: string
  area?: string
}

export function extractSearchIntent(
  message: string,
  existingMemory: Record<string, string> = {},
): SearchIntent {
  const text = message.toLowerCase()
  const result: SearchIntent = {}

  if (/\b(buy|purchase|buying|for sale|sale|للبيع|شراء)\b/.test(text)) result.transactionType = 'SALE'
  else if (/\b(rent|renting|lease|rental|for rent|للإيجار|ايجار|إيجار)\b/.test(text)) result.transactionType = 'RENT'
  else if (existingMemory.intent === 'buy') result.transactionType = 'SALE'
  else if (existingMemory.intent === 'rent') result.transactionType = 'RENT'

  if (/\b(studio|استوديو)\b/.test(text)) result.bedrooms = 'Studio'
  else {
    const br = text.match(/\b([1-6])[\s-]?(?:bed|br|bedroom|غرفة|غرف)\b/)
    if (br) result.bedrooms = br[1]
    else if (existingMemory.bedrooms) result.bedrooms = existingMemory.bedrooms
  }

  if (/\bpenthouse\b/.test(text)) result.category = 'Penthouse'
  else if (/\bvilla\b/.test(text)) result.category = 'Villa'
  else if (/\btownhouse\b/.test(text)) result.category = 'Townhouse'
  else if (/\b(apartment|flat|شقة)\b/.test(text)) result.category = 'Apartment'
  else if (existingMemory.category) result.category = existingMemory.category

  if (/\b(ready|move[\s-]?in|handover|ready to move)\b/.test(text)) result.status = 'Ready'
  else if (/\b(off[\s-]?plan|offplan|under construction|new project|قيد الإنشاء)\b/.test(text)) result.status = 'Off Plan'
  else if (existingMemory.status === 'Ready' || existingMemory.status === 'Off Plan') result.status = existingMemory.status

  const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m(?:illion)?|مليون)/i)
  const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand|ألف)/i)
  const aedMatch = text.match(/(?:aed|درهم)\s*([\d,]+)/i)
  const plainMatch = text.match(/\b(\d{5,})\b/)

  if (millionMatch) result.budget = String(parseFloat(millionMatch[1]) * 1_000_000)
  else if (thousandMatch) result.budget = String(parseFloat(thousandMatch[1]) * 1_000)
  else if (aedMatch) result.budget = aedMatch[1].replace(/,/g, '')
  else if (plainMatch) result.budget = plainMatch[1]
  else if (existingMemory.budget) result.budget = existingMemory.budget

  const areaAliases: Record<string, string> = {
    jvc: 'Jumeirah Village Circle',
    jlt: 'Jumeirah Lake Towers',
    jvt: 'Jumeirah Village Triangle',
    dlrc: 'Dubai Land Residence Complex',
    dsc: 'Dubai Sports City',
    dso: 'Dubai Silicon Oasis',
    downtown: 'Downtown Dubai',
    marina: 'Dubai Marina',
    bb: 'Business Bay',
    palm: 'Palm Jumeirah',
    'dubai hills': 'Dubai Hills Estate',
    'dubai islands': 'Dubai Islands',
    akoya: 'DAMAC Hills 2',
    'damac hills 2': 'DAMAC Hills 2',
    arjan: 'Arjan',
    'motor city': 'Motor City',
    majan: 'Majan',
    'al zorah': 'Al Zorah',
  }

  for (const [alias, canonical] of Object.entries(areaAliases)) {
    if (text.includes(alias)) {
      result.area = canonical
      break
    }
  }

  if (!result.area) {
    result.area = existingMemory.area_interest ?? existingMemory.area
  }

  return result
}

export function detectLanguage(text: string): 'en' | 'ar' {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) ?? []).length
  return arabicChars / Math.max(text.length, 1) > 0.2 ? 'ar' : 'en'
}

export function shouldHandoff(message: string): boolean {
  const lower = message.toLowerCase()
  const triggers = [
    'speak to',
    'speak with',
    'talk to',
    'talk with',
    'human agent',
    'live agent',
    'real agent',
    'real person',
    'call me',
    'connect me',
    'transfer me',
    'supervisor',
    'manager',
    'this is useless',
    'not helpful',
    'waste of time',
    'frustrated',
    'terrible',
    'worst',
    'bad service',
    'urgent',
    'emergency',
    'أريد شخص',
    'اتصل بي',
    'غير مفيد',
    'وكيل بشري',
    'مدير',
  ]
  return triggers.some((trigger) => lower.includes(trigger))
}
