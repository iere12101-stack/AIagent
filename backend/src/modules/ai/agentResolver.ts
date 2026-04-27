import { getSupabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js'
import { TEAM, type TeamMember } from '../../config/companyData.js'

export interface ResolvedAgent {
  id: string
  name: string
  role: string
  phone: string | null
  wa: string | null
  areas: string[]
  minBudget: number
  isDefault: boolean
  isClientFacing: boolean
}

interface TeamMemberRow {
  name: string
  role: string
  whatsapp: string
  area_speciality: string[] | null
  speciality_areas: string[] | null
  min_budget_aed: number | null
  route_to: string | null
  active: boolean
}

const INTERNAL_ONLY_NAMES = [
  'ayaz',
  'ayaz khan',
  'hrithik',
  'hrithik bharadwaj',
  'sarah shaheen',
  'maysoon',
  'sumbul',
  'laila',
]

function isInternalPerson(name: string): boolean {
  const normalized = name.toLowerCase().trim()
  return INTERNAL_ONLY_NAMES.some((internalName) => normalized.includes(internalName))
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function digitsOnly(value: string | null | undefined): string | null {
  if (!value) return null
  if (/team-verified|placeholder|\[|\{|[xX]{2,}/i.test(value)) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

function toPhone(whatsapp: string | null): string | null {
  const digits = digitsOnly(whatsapp)
  if (!digits) return null
  return `+${digits}`
}

function hasUsableContact(agent: ResolvedAgent): boolean {
  return Boolean(agent.isClientFacing && agent.phone && agent.wa)
}

function staticAgents(): ResolvedAgent[] {
  return (TEAM as unknown as TeamMember[]).map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    phone: member.phone,
    wa: member.wa,
    areas: [...member.areas],
    minBudget: member.minBudget,
    isDefault: Boolean(member.isDefault),
    isClientFacing: member.isClientFacing,
  }))
}

function mergeRow(base: ResolvedAgent, row: TeamMemberRow): ResolvedAgent {
  const dbWa = digitsOnly(row.whatsapp)
  const dbPhone = toPhone(row.whatsapp)
  const areas = [...(row.speciality_areas ?? []), ...(row.area_speciality ?? [])].filter(Boolean)

  return {
    ...base,
    role: row.role || base.role,
    phone: dbPhone ?? base.phone,
    wa: dbWa ?? base.wa,
    areas: areas.length > 0 ? areas : base.areas,
    minBudget: Number(row.min_budget_aed ?? base.minBudget ?? 0),
    isDefault: base.isDefault || row.role === 'Sales Manager' || row.route_to === 'HOT',
    isClientFacing: base.isClientFacing && row.active !== false,
  }
}

export async function getResolvedClientFacingTeam(orgId: string): Promise<ResolvedAgent[]> {
  const baseTeam = staticAgents()

  if (!isSupabaseConfigured()) {
    return baseTeam.filter((agent) => agent.isClientFacing)
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('team_members')
      .select('name, role, whatsapp, area_speciality, speciality_areas, min_budget_aed, route_to, active')
      .eq('org_id', orgId)
      .eq('active', true)

    if (error || !data) {
      return baseTeam.filter((agent) => agent.isClientFacing)
    }

    const merged = [...baseTeam]

    for (const row of data as TeamMemberRow[]) {
      if (isInternalPerson(row.name)) {
        console.log(`[AGENT_RESOLVER] Skipping internal staff from DB: ${row.name}`)
        continue
      }

      if (row.role === 'Receptionist') {
        continue
      }

      const normalizedRowName = normalizeName(row.name)
      const existingIndex = merged.findIndex(
        (agent) => normalizeName(agent.name) === normalizedRowName,
      )

      if (existingIndex >= 0) {
        merged[existingIndex] = mergeRow(merged[existingIndex], row)
        continue
      }

      const wa = digitsOnly(row.whatsapp)
      const phone = toPhone(row.whatsapp)
      if (!wa || !phone) {
        console.warn(`[AGENT_RESOLVER] Skipping DB agent with invalid phone: ${row.name}`)
        continue
      }

      merged.push({
        id: normalizedRowName.replace(/\s+/g, '-'),
        name: row.name,
        role: row.role,
        phone,
        wa,
        areas: [...(row.speciality_areas ?? []), ...(row.area_speciality ?? [])].filter(Boolean),
        minBudget: Number(row.min_budget_aed ?? 0),
        isDefault: row.role === 'Sales Manager' || row.route_to === 'HOT',
        isClientFacing: true,
      })
    }

    return merged.filter((agent) => agent.isClientFacing)
  } catch (error) {
    console.error('[AGENT_RESOLVER] DB query failed, using static team:', error)
    return baseTeam.filter((agent) => agent.isClientFacing)
  }
}

export async function findResolvedAgentByName(
  orgId: string,
  hint: string,
): Promise<ResolvedAgent | undefined> {
  if (isInternalPerson(hint)) return undefined

  const normalizedHint = normalizeName(hint)
  const team = await getResolvedClientFacingTeam(orgId)
  return team.find(
    (agent) => hasUsableContact(agent) && normalizeName(agent.name).includes(normalizedHint),
  )
}

export async function findBestResolvedAgent(
  orgId: string,
  area?: string,
  budget?: number,
): Promise<ResolvedAgent> {
  const team = await getResolvedClientFacingTeam(orgId)
  const reachable = team.filter(hasUsableContact)
  const fallback = reachable.length > 0 ? reachable : team

  if (budget && budget >= 5_000_000) {
    return (
      fallback.find((agent) => agent.id === 'imran' || normalizeName(agent.role) === 'ceo') ??
      fallback.find((agent) => agent.isDefault) ??
      fallback[0]
    )
  }

  if (area) {
    const normalizedArea = area.toLowerCase()
    const match = fallback.find((agent) =>
      agent.areas.some(
        (zone) =>
          zone.toLowerCase().includes(normalizedArea) ||
          normalizedArea.includes(zone.toLowerCase()),
      ),
    )
    if (match) return match
  }

  return fallback.find((agent) => agent.isDefault && hasUsableContact(agent)) ?? fallback[0]
}

export function resolvedAgentCard(agent: ResolvedAgent, lang: 'en' | 'ar'): string {
  if (!hasUsableContact(agent)) return ''

  const waUrl = `https://wa.me/${agent.wa}`
  return lang === 'ar'
    ? [
      '------------------',
      `*${agent.name}*`,
      `${agent.role}`,
      `${agent.phone}`,
      `WhatsApp: ${waUrl}`,
      '------------------',
    ].join('\n')
    : [
      '------------------',
      `*${agent.name}*`,
      `${agent.role}`,
      `${agent.phone}`,
      `WhatsApp: ${waUrl}`,
      '------------------',
    ].join('\n')
}
