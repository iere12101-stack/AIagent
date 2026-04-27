import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js'

export interface PropertyQuery {
  orgId: string
  category?: 'sale' | 'rent'
  area?: string
  bedrooms?: string
  minPrice?: number
  maxPrice?: number
  status?: 'ready' | 'off-plan'
  type?: 'apartment' | 'villa' | 'townhouse' | 'penthouse'
  transactionType?: 'SALE' | 'RENT'
  source?: 'direct' | 'indirect'
  limit?: number
}

export interface PropertyMatch {
  ref: string
  ref_number?: string | null
  type: 'apartment' | 'villa' | 'townhouse' | 'penthouse' | null
  transaction_type?: 'SALE' | 'RENT' | null
  category: 'sale' | 'rent' | null
  bedrooms: string | null
  bathrooms?: string | null
  size_sqft: number | null
  status: 'ready' | 'off-plan' | null
  district: string
  building: string | null
  price_aed: number
  agent_id: string | null
  agent_name?: string | null
  agent_whatsapp?: string | null
  available: boolean | null
  description?: string | null
  source?: 'direct' | 'indirect' | null
  partner_agency?: string | null
  partner_agent_name?: string | null
  partner_agent_phone?: string | null
  partner_agent_email?: string | null
  co_broker_commission?: number | null
  listing_url?: string | null
}

export interface DualSourceResult {
  properties: PropertyMatch[]
  source: 'direct' | 'indirect' | 'none'
  directCount: number
  indirectCount: number
  usedFallback: boolean
}

export interface PropertySearchIntent {
  area?: string
  bedrooms?: string
  type?: PropertyQuery['type']
  category?: PropertyQuery['category']
  status?: PropertyQuery['status']
  minPrice?: number
  maxPrice?: number
  agentMeeting?: boolean
  callRequested?: boolean
}

interface CachedPropertySet {
  fetchedAt: number
  items: PropertyMatch[]
}

const PROPERTY_CACHE_TTL_MS = 15 * 60 * 1000

const AREA_ALIASES: Record<string, string> = {
  jvc: 'JVC',
  'jumeirah village circle': 'JVC',
  jlt: 'JLT',
  'jumeirah lake towers': 'JLT',
  jvt: 'JVT',
  'dubai marina': 'Dubai Marina',
  marina: 'Dubai Marina',
  downtown: 'Downtown Dubai',
  'downtown dubai': 'Downtown Dubai',
  'business bay': 'Business Bay',
  bb: 'Business Bay',
  arjan: 'Arjan',
  'motor city': 'Motor City',
  'dubai sports city': 'Dubai Sports City',
  dsc: 'Dubai Sports City',
  majan: 'Majan',
  dlrc: 'Dubai Land Residence Complex',
  'dubai land residence complex': 'Dubai Land Residence Complex',
  'al zorah': 'Al Zorah',
}

export class PropertyMatcher {
  private readonly supabase = isSupabaseConfigured() ? getSupabaseAdmin() : null
  private static readonly propertyCache = new Map<string, CachedPropertySet>()
  private static refreshTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.ensureRefreshLoop()
  }

  private filterProperties(properties: PropertyMatch[], query: PropertyQuery): PropertyMatch[] {
    const normalizedArea = query.area ? this.normalizeArea(query.area).toLowerCase() : null
    const bedroomFilter = query.bedrooms?.toLowerCase().trim()
    const sourceFilter = query.source ?? 'direct'

    return properties.filter((property) => {
      if (!property.available) {
        return false
      }

      if (sourceFilter && property.source !== sourceFilter) {
        return false
      }

      if (query.category && property.category !== query.category) {
        return false
      }

      if (query.transactionType && property.transaction_type !== query.transactionType) {
        return false
      }

      if (query.status && property.status !== query.status) {
        return false
      }

      if (bedroomFilter && (property.bedrooms ?? '').toLowerCase().trim() !== bedroomFilter) {
        return false
      }

      // ── BUDGET FILTERS — CRITICAL FIX ──
      // ALWAYS apply budget filter when provided. Do NOT skip if value is 0 or falsy.
      if (query.maxPrice !== undefined && query.maxPrice > 0) {
        if (property.price_aed > query.maxPrice) {
          return false
        }
      }
      if (query.minPrice !== undefined && query.minPrice > 0) {
        if (property.price_aed < query.minPrice) {
          return false
        }
      }

      if (normalizedArea) {
        const district = property.district.toLowerCase()
        const building = (property.building ?? '').toLowerCase()
        if (!district.includes(normalizedArea) && !building.includes(normalizedArea)) {
          return false
        }
      }

      return true
    })
  }

  async search(query: PropertyQuery): Promise<PropertyMatch[]> {
    if (!this.supabase) {
      return []
    }

    const cachedProperties = await this.getCachedProperties(query.orgId)
    const filtered = this.filterProperties(cachedProperties, query)
    const maxResults = Math.min(query.limit ?? 3, 3)
    return filtered.slice(0, maxResults)
  }

  async searchWaterfall(query: PropertyQuery): Promise<DualSourceResult> {
    if (!this.supabase) {
      return {
        properties: [],
        source: 'none',
        directCount: 0,
        indirectCount: 0,
        usedFallback: false,
      }
    }

    const directQuery: PropertyQuery = {
      orgId: query.orgId,
      category: query.category,
      area: query.area,
      bedrooms: query.bedrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      status: query.status,
      type: query.type,
      transactionType: query.transactionType,
      source: 'direct' as const,
      limit: query.limit ?? 3,
    }
    const directResults = await this.search(directQuery)
    const directCountQuery: PropertyQuery = {
      orgId: query.orgId,
      category: query.category,
      area: query.area,
      bedrooms: query.bedrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      status: query.status,
      type: query.type,
      transactionType: query.transactionType,
      source: 'direct' as const,
      limit: undefined,
    }
    const directCount = (await this.countMatches(directCountQuery))

    if (directCount > 0) {
      return {
        properties: directResults.slice(0, query.limit ?? 3),
        source: 'direct',
        directCount,
        indirectCount: 0,
        usedFallback: false,
      }
    }

    const indirectQuery: PropertyQuery = {
      orgId: query.orgId,
      category: query.category,
      area: query.area,
      bedrooms: query.bedrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      status: query.status,
      type: query.type,
      transactionType: query.transactionType,
      source: 'indirect' as const,
      limit: query.limit ?? 3,
    }
    const indirectResults = await this.search(indirectQuery)
    const indirectCountQuery: PropertyQuery = {
      orgId: query.orgId,
      category: query.category,
      area: query.area,
      bedrooms: query.bedrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      status: query.status,
      type: query.type,
      transactionType: query.transactionType,
      source: 'indirect' as const,
      limit: undefined,
    }
    const indirectCount = (await this.countMatches(indirectCountQuery))

    return {
      properties: indirectResults.slice(0, query.limit ?? 3),
      source: indirectResults.length > 0 ? 'indirect' : 'none',
      directCount: 0,
      indirectCount,
      usedFallback: indirectResults.length > 0,
    }
  }

  private async countMatches(query: PropertyQuery): Promise<number> {
    const cachedProperties = await this.getCachedProperties(query.orgId)
    return this.filterProperties(cachedProperties, query).length
  }

  async logInventoryGap(params: {
    orgId: string
    contactId?: string
    conversationId?: string
    query: PropertyQuery
    directCount: number
    indirectCount: number
    usedFallback: boolean
  }): Promise<void> {
    if (params.directCount > 0) {
      return
    }

    try {
      await this.supabase?.from('inventory_gaps').insert({
        org_id: params.orgId,
        contact_id: params.contactId ?? null,
        conversation_id: params.conversationId ?? null,
        transaction_type: params.query.transactionType ?? null,
        area: params.query.area ?? null,
        bedrooms: params.query.bedrooms ?? null,
        budget_min: params.query.minPrice ?? null,
        budget_max: params.query.maxPrice ?? null,
        status_wanted: params.query.status ?? null,
        category: params.query.category ?? null,
        direct_results: params.directCount,
        indirect_results: params.indirectCount,
        used_fallback: params.usedFallback,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Failed to log inventory gap', err)
    }
  }

  parseBudget(text: string): { min?: number; max?: number } {
    const normalizedText = text.toLowerCase().replace(/,/g, '').trim()
    const rangeMatch = normalizedText.match(
      /(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/,
    )
    if (rangeMatch) {
      return {
        min: this.convertBudgetValue(rangeMatch[1], rangeMatch[2]),
        max: this.convertBudgetValue(rangeMatch[3], rangeMatch[4]),
      }
    }

    const aedMatch = normalizedText.match(/aed\s*(\d+(?:\.\d+)?)(m|million|k|thousand)?/)
    if (aedMatch) {
      const amount = this.convertBudgetValue(aedMatch[1], aedMatch[2])
      return { min: amount * 0.85, max: amount * 1.15 }
    }

    const amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(m|million|k|thousand)/)
    if (amountMatch) {
      const amount = this.convertBudgetValue(amountMatch[1], amountMatch[2])
      return { min: amount * 0.85, max: amount * 1.15 }
    }

    const plainNumber = normalizedText.match(/\b(\d{5,})\b/)
    if (plainNumber) {
      const amount = Number(plainNumber[1])
      return { min: amount * 0.85, max: amount * 1.15 }
    }

    return {}
  }

  extractIntent(text: string): PropertySearchIntent {
    const lowerText = text.toLowerCase()
    const budget = this.parseBudget(text)

    const area = Object.keys(AREA_ALIASES).find((alias) => lowerText.includes(alias))
    const bedroomMatch = lowerText.match(/\b(studio|[1-7])\s*(?:bed|bedroom|br)?\b/)
    const type = ['apartment', 'villa', 'townhouse', 'penthouse'].find((propertyType) =>
      lowerText.includes(propertyType),
    ) as PropertyQuery['type'] | undefined

    // Detect agent meeting intent
    const agentMeetingKeywords = [
      'meet agent', 'talk to agent', 'call me', 'visit office',
      'speak to agent', 'connect me', 'arrange meeting',
      'schedule meeting', 'book appointment', 'see agent',
      'contact agent', 'agent meeting', 'meet with agent',
      'want to meet', 'would like to meet', 'i need meeting',
      'i want agent', 'need agent', 'want agent',
      'call agent', 'get agent', 'contact specialist',
      'meet specialist', 'speak to specialist',
    ]

    const agentMeeting = agentMeetingKeywords.some(keyword => lowerText.includes(keyword))
    const callRequested = ['call me', 'call now', 'give me a call', 'phone me', 'ring me', 'contact me by phone'].some((keyword) => lowerText.includes(keyword))

    return {
      area: area ? AREA_ALIASES[area] : undefined,
      bedrooms: bedroomMatch ? bedroomMatch[1] : undefined,
      type,
      category: lowerText.includes('rent') ? 'rent' : lowerText.includes('buy') || lowerText.includes('sale') ? 'sale' : undefined,
      status: lowerText.includes('off-plan') ? 'off-plan' : lowerText.includes('ready') ? 'ready' : undefined,
      minPrice: budget.min,
      maxPrice: budget.max,
      agentMeeting,
      callRequested,
    }
  }

  isStrongIntent(text: string, memory?: Record<string, unknown>): boolean {
    const lowerText = text.toLowerCase()

    // Strong keywords that indicate explicit property search intent
    const strongKeywords = [
      "show", "looking for", "find", "search", "apartment", "villa", "studio",
      "bedroom", "buy", "rent", "properties", "property", "listings", "options",
      "available", "for sale", "for rent", "2 bedroom", "3 bedroom", "1 bedroom"
    ]

    const hasKeyword = strongKeywords.some(keyword => lowerText.includes(keyword))

    // Check if user has previously confirmed intent in memory
    const memoryIntent = memory?.intent as string
    const hasConfirmedIntent = memoryIntent === "buy" || memoryIntent === "rent" || memoryIntent === "invest"

    return hasKeyword || hasConfirmedIntent
  }

  formatCards(properties: PropertyMatch[], language: 'en' | 'ar' = 'en'): string {
    if (properties.length === 0) {
      return language === 'ar'
        ? 'لم أجد تطابقًا دقيقًا الآن. يمكنني توصيلك بأحد مستشاري العقارات لمراجعة الخيارات المتاحة.'
        : 'I could not find an exact match right now. I can connect you with one of our consultants to check more live options.'
    }

    const isIndirect = properties[0].source === 'indirect'
    const header = isIndirect
      ? language === 'ar'
        ? '🔍 *عقارات شركاء السوق* — لم نجد تطابقًا مباشرًا في محفظتنا:\n\n'
        : '🔍 *Partner market listings* — no exact matches in our direct portfolio:\n\n'
      : ''

    const divider = '\n\n----------------\n\n'
    const formatter = language === 'ar' ? this.formatArabicProperty.bind(this) : this.formatEnglishProperty.bind(this)
    return header + properties.slice(0, 3).map(formatter).join(divider)
  }

  normalizeArea(input: string): string {
    return AREA_ALIASES[input.toLowerCase().trim()] ?? input.trim()
  }

  private async getCachedProperties(orgId: string): Promise<PropertyMatch[]> {
    const existing = PropertyMatcher.propertyCache.get(orgId)
    const isFresh = existing && Date.now() - existing.fetchedAt < PROPERTY_CACHE_TTL_MS
    if (isFresh) {
      return existing.items
    }

    await this.refreshOrgCache(orgId)
    return PropertyMatcher.propertyCache.get(orgId)?.items ?? []
  }

  private async refreshOrgCache(orgId: string): Promise<void> {
    if (!this.supabase) {
      return
    }

    const { data, error } = await this.supabase
      .from('properties')
      .select(
        'ref, ref_number, type, category, bedrooms, bathrooms, size_sqft, status, district, building, price_aed, agent_id, agent_name, agent_whatsapp, available, description, source, partner_agency, partner_agent_name, partner_agent_phone, partner_agent_email, co_broker_commission, listing_url',
      )
      .eq('org_id', orgId)
      .eq('available', true)
      .order('price_aed', { ascending: true })

    if (error) {
      return
    }

    const normalized = (data ?? []).map((property) => ({
      ...property,
      price_aed: Number(property.price_aed),
      size_sqft: property.size_sqft === null ? null : Number(property.size_sqft),
    }))

    PropertyMatcher.propertyCache.set(orgId, {
      fetchedAt: Date.now(),
      items: normalized,
    })
  }

  private ensureRefreshLoop(): void {
    if (PropertyMatcher.refreshTimer || !this.supabase) {
      return
    }

    PropertyMatcher.refreshTimer = setInterval(() => {
      const orgIds = Array.from(PropertyMatcher.propertyCache.keys())
      orgIds.forEach((orgId) => {
        void this.refreshOrgCache(orgId).catch(() => undefined)
      })
    }, PROPERTY_CACHE_TTL_MS)

    if (typeof PropertyMatcher.refreshTimer.unref === 'function') {
      PropertyMatcher.refreshTimer.unref()
    }
  }

  private convertBudgetValue(rawValue: string, rawUnit?: string): number {
    const value = Number(rawValue)
    const unit = rawUnit?.toLowerCase()

    if (unit === 'm' || unit === 'million') {
      return value * 1_000_000
    }

    if (unit === 'k' || unit === 'thousand') {
      return value * 1_000
    }

    return value
  }

  private formatEnglishProperty(property: PropertyMatch, index: number): string {
    const bedrooms = property.bedrooms ? `${property.bedrooms} BR` : 'N/A'
    const size = property.size_sqft ? `${property.size_sqft.toLocaleString()} sqft` : 'Size on request'
    return [
      `*${property.district}${property.building ? `, ${property.building}` : ''}*`,
      `${bedrooms} | ${size}`,
      `AED ${property.price_aed.toLocaleString()}`,
      `Status: ${property.status ?? 'team-check required'}`,
      `Ref: ${property.ref}`,
    ].join('\n')
  }

  private formatArabicProperty(property: PropertyMatch, index: number): string {
    const bedrooms = property.bedrooms ? `${property.bedrooms} غرفة` : 'عدد الغرف عند الطلب'
    const size = property.size_sqft ? `${property.size_sqft.toLocaleString()} قدم مربع` : 'المساحة عند الطلب'
    return [
      `*العقار ${index + 1}*`,
      `${property.district}${property.building ? `، ${property.building}` : ''}`,
      `${bedrooms} | ${size}`,
      `ابتداءً من AED ${property.price_aed.toLocaleString()}`,
      `الحالة: ${property.status ?? 'بحاجة لتأكيد الفريق'}`,
      `المرجع: ${property.ref}`,
    ].join('\n')
  }
}
