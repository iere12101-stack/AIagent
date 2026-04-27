import { getSupabaseAdmin } from '../../config/supabase.js'

export interface ContactMemory {
  language: 'en' | 'ar'
  intent: 'buy' | 'rent' | 'invest' | 'unknown'
  area?: string
  bedrooms?: string
  maxBudget?: number
  minBudget?: number
  transactionType?: 'SALE' | 'RENT'
  assignedAgentId?: string
  assignedAgentName?: string
  assignedAgentPhone?: string
  leadScore: 'cold' | 'warm' | 'hot' | 'vip'
  isFirstMessage: boolean
  messageCount: number
  lastIntent?: string
  lastShownPropertyRefs?: string
  viewingRequested?: boolean
  handoffTriggered?: boolean
}

const DEFAULT_MEMORY: ContactMemory = {
  language: 'en',
  intent: 'unknown',
  leadScore: 'cold',
  isFirstMessage: true,
  messageCount: 0,
}

async function getContactId(phoneNumber: string, orgId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phoneNumber)
    .eq('org_id', orgId)
    .maybeSingle()

  return data?.id ?? null
}

function parseMemoryValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^\d+$/.test(value)) return Number(value)
  return value
}

export async function readMemory(phoneNumber: string, orgId: string): Promise<ContactMemory> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { ...DEFAULT_MEMORY }

  try {
    const contactId = await getContactId(phoneNumber, orgId)
    if (!contactId) return { ...DEFAULT_MEMORY }

    const { data: memoryRows } = await supabase
      .from('contact_memory')
      .select('key, value')
      .eq('contact_id', contactId)

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in(
        'conversation_id',
        (
          await supabase
            .from('conversations')
            .select('id')
            .eq('org_id', orgId)
            .eq('contact_id', contactId)
        ).data?.map((row) => row.id) ?? [],
      )

    const memory = Object.fromEntries(
      (memoryRows ?? []).map((row) => [row.key, parseMemoryValue(row.value)]),
    ) as Partial<ContactMemory>

    return {
      ...DEFAULT_MEMORY,
      ...memory,
      isFirstMessage: (count ?? 0) <= 1,
      messageCount: count ?? 0,
    }
  } catch (error) {
    console.warn('[MEMORY] Read failed:', error)
    return { ...DEFAULT_MEMORY }
  }
}

export async function updateMemory(
  phoneNumber: string,
  orgId: string,
  patch: Partial<ContactMemory>,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  try {
    const contactId = await getContactId(phoneNumber, orgId)
    if (!contactId) return

    const now = new Date().toISOString()
    const rows = Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({
        contact_id: contactId,
        key,
        value: String(value),
        updated_at: now,
      }))

    if (rows.length === 0) return

    const { error } = await supabase
      .from('contact_memory')
      .upsert(rows, { onConflict: 'contact_id,key' })

    if (error) {
      console.warn('[MEMORY] Update failed:', error.message)
    }
  } catch (error) {
    console.warn('[MEMORY] Update failed:', error)
  }
}

export async function extractAndUpdateMemory(
  phoneNumber: string,
  orgId: string,
  message: string,
  currentMemory: ContactMemory,
): Promise<ContactMemory> {
  const lower = message.toLowerCase()
  const patch: Partial<ContactMemory> = {}

  if (/[\u0600-\u06FF]/.test(message)) patch.language = 'ar'

  if (/\b(buy|purchase|buying|invest)\b/.test(lower)) {
    patch.intent = 'buy'
    patch.transactionType = 'SALE'
  } else if (/\b(rent|rental|renting|lease)\b/.test(lower)) {
    patch.intent = 'rent'
    patch.transactionType = 'RENT'
  }

  const areas = [
    'jvc',
    'jumeirah village circle',
    'marina',
    'dubai marina',
    'business bay',
    'downtown',
    'palm jumeirah',
    'jlt',
    'jumeirah lake towers',
    'jvt',
    'jumeirah village triangle',
    'arjan',
    'motor city',
    'dsc',
    'dubai sports city',
    'majan',
    'liwan',
    'silicon oasis',
    'dso',
    'damac hills',
    'akoya',
    'dubailand',
    'dubai islands',
    'meydan',
    'town square',
    'al furjan',
    'discovery gardens',
    'international city',
    'difc',
    'jbr',
    'al zorah',
    'aljada',
    'dubai land',
    'dlrc',
  ]

  for (const area of areas) {
    if (lower.includes(area)) {
      patch.area = area === 'marina'
        ? 'Dubai Marina'
        : area === 'jvc'
          ? 'JVC'
          : area === 'jlt'
            ? 'JLT'
            : area === 'dsc'
              ? 'Dubai Sports City'
              : area === 'dso' || area === 'silicon oasis'
                ? 'Dubai Silicon Oasis'
                : area.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      break
    }
  }

  const bedsMatch =
    message.match(/\b(\d+)\s*(?:br|bed|bedroom|bedrooms)\b/i) ??
    message.match(/\b(studio)\b/i)
  if (bedsMatch) {
    patch.bedrooms = bedsMatch[1]?.toLowerCase() === 'studio' ? 'Studio' : bedsMatch[1]
  }

  const extractBudget = (rawText: string): number | undefined => {
    const cleaned = rawText.replace(/,/g, '').replace(/aed/gi, '').trim()
    const million = cleaned.match(/(\d+(?:\.\d+)?)\s*m(?:illion)?/i)
    if (million) return Math.round(parseFloat(million[1]) * 1_000_000)
    const thousand = cleaned.match(/(\d+(?:\.\d+)?)\s*k(?:ilo|thousand)?/i)
    if (thousand) return Math.round(parseFloat(thousand[1]) * 1_000)
    const plain = cleaned.match(/\b(\d{5,9})\b/)
    if (plain) return parseInt(plain[1], 10)
    const small = cleaned.match(/\b(\d{4})\b/)
    if (small) return parseInt(small[1], 10)
    return undefined
  }

  if (/\b(max|maximum|under|below|up to)\b/.test(lower)) {
    const budget = extractBudget(message)
    if (budget) patch.maxBudget = budget
  } else if (/\b(min|minimum|at least|above|from|starting)\b/.test(lower)) {
    const budget = extractBudget(message)
    if (budget) patch.minBudget = budget
  } else {
    const budget = extractBudget(message)
    if (budget) patch.maxBudget = budget
  }

  if (/\b(ready|serious|today|urgent|sign|deposit|now)\b/.test(lower)) {
    patch.leadScore = 'hot'
  } else if (/\b(interested|viewing|visit|schedule|book)\b/.test(lower)) {
    if (currentMemory.leadScore === 'cold') patch.leadScore = 'warm'
  }

  const updated = { ...currentMemory, ...patch, isFirstMessage: false }
  await updateMemory(phoneNumber, orgId, patch)
  return updated
}
