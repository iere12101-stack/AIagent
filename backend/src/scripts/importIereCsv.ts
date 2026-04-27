import fs from 'node:fs/promises'
import path from 'node:path'
import { getSupabaseAdmin } from '../config/supabase.js'

type CsvRecord = Record<string, string>

type TeamMemberRow = {
  id: string
  name: string
  whatsapp: string
  email: string
}

type TeamImportSummary = {
  inserted: number
  updated: number
  skipped: number
}

type PropertiesImportSummary = {
  inserted: number
  updated: number
  skipped: number
  warnings: string[]
}

const DEFAULT_TEAM_CSV = 'f:\\IERE\\Property\\Team member.csv'
const DEFAULT_PROPERTIES_CSV = 'f:\\IERE\\Property\\Properties.csv'
const ROLE_VALUES = new Set(['CEO', 'Sales Manager', 'Agent', 'Receptionist'])
const ROUTE_VALUES = new Set(['VIP', 'HOT', 'WARM', 'SUPPORT'])

function parseArgs() {
  const raw = process.argv.slice(2)
  const params = new Map<string, string>()

  for (const token of raw) {
    if (!token.startsWith('--')) continue
    const [key, value] = token.slice(2).split('=', 2)
    if (key && value) params.set(key, value)
  }

  return {
    teamPath: params.get('team') ?? DEFAULT_TEAM_CSV,
    propertiesPath: params.get('properties') ?? DEFAULT_PROPERTIES_CSV,
    orgId: params.get('org') ?? null,
  }
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (char === '\r') {
      continue
    }

    if (char === '"') {
      const next = input[index + 1]
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    field += char
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, '').trim()
}

function csvRecordsFromHeader(raw: string, firstHeaderCell: string): CsvRecord[] {
  const rows = parseCsvRows(raw)
  const headerRowIndex = rows.findIndex(
    (row) => stripBom(row[0] ?? '').toLowerCase() === firstHeaderCell.toLowerCase(),
  )

  if (headerRowIndex < 0) {
    throw new Error(`Header "${firstHeaderCell}" not found in CSV file`)
  }

  const header = rows[headerRowIndex].map((value) => stripBom(value))
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => stripBom(cell).length > 0))

  return dataRows.map((row) => {
    const record: CsvRecord = {}
    header.forEach((columnName, columnIndex) => {
      record[columnName] = stripBom(row[columnIndex] ?? '')
    })
    return record
  })
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function toNumber(value: string): number | null {
  if (!value) return null
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toBoolean(value: string, fallback = false): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true
  if (normalized === 'false' || normalized === 'no' || normalized === '0') return false
  return fallback
}

function parseDate(value: string): string | null {
  if (!value) return null
  const normalized = value.trim()
  const match = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (!match) return null

  const day = Number(match[1])
  const monthToken = match[2].toLowerCase()
  const yearToken = match[3]
  const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }

  const month = monthMap[monthToken]
  if (month === undefined) return null

  let year = Number(yearToken)
  if (yearToken.length === 2) {
    year += 2000
  }

  if (!Number.isFinite(day) || !Number.isFinite(year)) {
    return null
  }

  const date = new Date(Date.UTC(year, month, day))
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const yyyy = date.getUTCFullYear().toString().padStart(4, '0')
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = date.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function normalizePhone(value: string): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw) return null

  const cleaned = raw.replace(/,/g, '')
  let digits = cleaned.replace(/\D/g, '')

  if (!digits && /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(cleaned)) {
    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) {
      digits = Math.round(parsed).toString()
    }
  }

  if (!digits) return null
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `971${digits.slice(1)}`
  }

  return `+${digits}`
}

function normalizeAreas(value: string): string[] {
  if (!value) return []
  const normalized = value.trim()
  if (!normalized) return []
  if (/all areas/i.test(normalized)) return ['all']

  return normalized
    .split(',')
    .map((entry) => entry.trim())
    .map((entry) => (entry.toLowerCase() === 'dsc' ? 'Dubai Sports City' : entry))
    .map((entry) => (entry.toLowerCase() === 'downtown' ? 'Downtown Dubai' : entry))
    .filter(Boolean)
}

function normalizeRole(value: string): 'CEO' | 'Sales Manager' | 'Agent' | 'Receptionist' {
  if (ROLE_VALUES.has(value)) return value as 'CEO' | 'Sales Manager' | 'Agent' | 'Receptionist'
  return 'Agent'
}

function defaultRouteForRole(role: 'CEO' | 'Sales Manager' | 'Agent' | 'Receptionist'): 'VIP' | 'HOT' | 'WARM' | 'SUPPORT' {
  if (role === 'CEO') return 'VIP'
  if (role === 'Sales Manager') return 'HOT'
  if (role === 'Receptionist') return 'SUPPORT'
  return 'WARM'
}

function normalizeRoute(
  value: string,
  role: 'CEO' | 'Sales Manager' | 'Agent' | 'Receptionist',
): 'VIP' | 'HOT' | 'WARM' | 'SUPPORT' {
  const candidate = value.trim().toUpperCase()
  if (ROUTE_VALUES.has(candidate)) {
    return candidate as 'VIP' | 'HOT' | 'WARM' | 'SUPPORT'
  }
  return defaultRouteForRole(role)
}

function emailBaseFromName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  return normalized || 'team.member'
}

function buildUniqueEmail(name: string, usedEmails: Set<string>): string {
  const base = emailBaseFromName(name)
  let attempt = 0

  while (attempt < 1000) {
    const candidate = attempt === 0
      ? `${base}@investmentexperts.ae`
      : `${base}.${attempt}@investmentexperts.ae`

    const key = candidate.toLowerCase()
    if (!usedEmails.has(key)) {
      usedEmails.add(key)
      return candidate
    }
    attempt += 1
  }

  const fallback = `${base}.${Date.now()}@investmentexperts.ae`
  usedEmails.add(fallback.toLowerCase())
  return fallback
}

function normalizeTransactionType(value: string): 'SALE' | 'RENT' | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'SALE') return 'SALE'
  if (normalized === 'RENT') return 'RENT'
  return null
}

function normalizePropertyType(value: string): 'apartment' | 'villa' | 'townhouse' | 'penthouse' {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'villa') return 'villa'
  if (normalized === 'townhouse') return 'townhouse'
  if (normalized === 'penthouse') return 'penthouse'
  return 'apartment'
}

function normalizePropertyStatus(value: string): 'ready' | 'off-plan' | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'ready') return 'ready'
  if (normalized === 'off plan' || normalized === 'off-plan' || normalized === 'offplan') return 'off-plan'
  return null
}

async function resolveOrgId(
  requestedOrgId: string | null,
): Promise<{ id: string; name: string }> {
  const supabase = getSupabaseAdmin()

  if (requestedOrgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', requestedOrgId)
      .maybeSingle()

    if (error || !data) {
      throw new Error(`Organization not found for --org=${requestedOrgId}`)
    }
    return data
  }

  const { data: iereOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%Investment Experts%')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (iereOrg) {
    return iereOrg
  }

  const { data: firstOrg, error } = await supabase
    .from('organizations')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !firstOrg) {
    throw new Error('No organization found. Create an organization first.')
  }

  return firstOrg
}

async function importTeamMembers(
  orgId: string,
  records: CsvRecord[],
): Promise<TeamImportSummary> {
  const supabase = getSupabaseAdmin()

  const { data: existingRows, error: existingError } = await supabase
    .from('team_members')
    .select('id, name, whatsapp, email')
    .eq('org_id', orgId)

  if (existingError) {
    throw new Error(`Failed to read existing team members: ${existingError.message}`)
  }

  const existingByName = new Map<string, TeamMemberRow>()
  const usedEmails = new Set<string>()

  for (const row of existingRows ?? []) {
    existingByName.set(normalizeNameKey(row.name), row)
    if (row.email) {
      usedEmails.add(row.email.toLowerCase())
    }
  }

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const record of records) {
    const name = (record['Name'] ?? '').trim()
    if (!name) {
      skipped += 1
      continue
    }

    const role = normalizeRole((record['Role'] ?? '').trim())
    const routeTo = normalizeRoute(record['Route To'] ?? '', role)
    const whatsapp = normalizePhone(record['WhatsApp'] ?? '')
    if (!whatsapp) {
      skipped += 1
      continue
    }

    const speciality = normalizeAreas(record['Speciality Areas'] ?? '')
    const minBudget = toNumber(record['Min Budget (AED)'] ?? '')
    const active = toBoolean(record['Active'] ?? '', true)
    const notes = (record['Notes'] ?? '').trim() || null

    const key = normalizeNameKey(name)
    const existing = existingByName.get(key)
    const email = existing?.email || buildUniqueEmail(name, usedEmails)

    const payload = {
      org_id: orgId,
      name,
      role,
      whatsapp,
      email,
      area_speciality: speciality,
      speciality_areas: speciality,
      route_to: routeTo,
      budget_threshold_aed: minBudget,
      min_budget_aed: minBudget,
      active,
      notes,
    }

    if (existing) {
      const { error } = await supabase
        .from('team_members')
        .update(payload)
        .eq('id', existing.id)

      if (error) {
        throw new Error(`Failed updating team member "${name}": ${error.message}`)
      }
      updated += 1
      continue
    }

    const { error } = await supabase
      .from('team_members')
      .insert(payload)

    if (error) {
      throw new Error(`Failed inserting team member "${name}": ${error.message}`)
    }
    inserted += 1
  }

  return { inserted, updated, skipped }
}

async function fetchTeamDirectory(orgId: string): Promise<Map<string, { id: string; whatsapp: string | null }>> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, whatsapp')
    .eq('org_id', orgId)

  if (error) {
    throw new Error(`Failed to load team members for property mapping: ${error.message}`)
  }

  const map = new Map<string, { id: string; whatsapp: string | null }>()
  for (const row of data ?? []) {
    map.set(normalizeNameKey(row.name), {
      id: row.id,
      whatsapp: row.whatsapp ?? null,
    })
  }
  return map
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < input.length; index += size) {
    chunks.push(input.slice(index, index + size))
  }
  return chunks
}

async function importProperties(
  orgId: string,
  records: CsvRecord[],
  teamDirectory: Map<string, { id: string; whatsapp: string | null }>,
): Promise<PropertiesImportSummary> {
  const supabase = getSupabaseAdmin()
  const warnings: string[] = []
  let skipped = 0

  const { data: existingRows, error: existingError } = await supabase
    .from('properties')
    .select('ref')
    .eq('org_id', orgId)

  if (existingError) {
    throw new Error(`Failed to read existing properties: ${existingError.message}`)
  }

  const existingRefs = new Set((existingRows ?? []).map((row) => (row.ref ?? '').toUpperCase()))
  const upsertByRef = new Map<string, Record<string, unknown>>()

  for (const record of records) {
    const ref = (record['Ref Number'] ?? '').trim().toUpperCase()
    if (!ref) {
      skipped += 1
      warnings.push('Skipped a property row with empty Ref Number')
      continue
    }

    const transactionType = normalizeTransactionType(record['Type'] ?? '')
    if (!transactionType) {
      skipped += 1
      warnings.push(`Skipped ${ref}: invalid Type "${record['Type'] ?? ''}"`)
      continue
    }

    const categoryRaw = (record['Category'] ?? '').trim()
    const propertyType = normalizePropertyType(categoryRaw)
    const status = normalizePropertyStatus(record['Status'] ?? '')
    const district = (record['District'] ?? '').trim() || (record['Full Area'] ?? '').trim() || 'Unknown'
    const building = (record['Building'] ?? '').trim() || null
    const fullArea = (record['Full Area'] ?? '').trim() || district
    const priceAed = toNumber(record['Price (AED)'] ?? '')
    const sizeSqft = toNumber(record['Size (sqft)'] ?? '')
    const listedOn = parseDate(record['Listed On'] ?? '')
    const lastUpdated = parseDate(record['Last Updated'] ?? '')
    const bedrooms = (record['Beds'] ?? '').trim() || null
    const bathrooms = (record['Baths'] ?? '').trim() || null
    const available = toBoolean(record['Available'] ?? '', true)
    const permitNumber = (record['Permit No.'] ?? '').trim() || null
    const portal = (record['Portal'] ?? '').trim() || null
    const agentName = (record['Agent'] ?? '').trim() || null

    if (priceAed === null) {
      skipped += 1
      warnings.push(`Skipped ${ref}: invalid Price (AED) "${record['Price (AED)'] ?? ''}"`)
      continue
    }

    const agentKey = agentName ? normalizeNameKey(agentName) : ''
    const mappedAgent = agentKey ? teamDirectory.get(agentKey) : undefined
    const agentWhatsapp = normalizePhone(record['Agent WhatsApp'] ?? '') ?? mappedAgent?.whatsapp ?? null
    const agentId = mappedAgent?.id ?? null

    const payload: Record<string, unknown> = {
      org_id: orgId,
      ref,
      ref_number: ref,
      type: propertyType,
      category: transactionType === 'SALE' ? 'sale' : 'rent',
      transaction_type: transactionType,
      status,
      district,
      building,
      full_area: fullArea,
      bedrooms,
      bathrooms,
      size_sqft: sizeSqft,
      price_aed: priceAed,
      available,
      permit_number: permitNumber,
      portal,
      listed_on: listedOn,
      last_updated: lastUpdated,
      agent_name: agentName,
      agent_whatsapp: agentWhatsapp,
      agent_id: agentId,
    }

    upsertByRef.set(ref, payload)
  }

  const upsertRows = Array.from(upsertByRef.values())
  let inserted = 0
  let updated = 0

  for (const payload of upsertRows) {
    const ref = String(payload.ref).toUpperCase()
    if (existingRefs.has(ref)) {
      updated += 1
    } else {
      inserted += 1
      existingRefs.add(ref)
    }
  }

  const chunks = chunkArray(upsertRows, 50)
  for (const chunk of chunks) {
    const { error } = await supabase
      .from('properties')
      .upsert(chunk, { onConflict: 'org_id,ref', ignoreDuplicates: false })

    if (error) {
      throw new Error(`Failed upserting property batch: ${error.message}`)
    }
  }

  return { inserted, updated, skipped, warnings }
}

async function main() {
  const { teamPath, propertiesPath, orgId } = parseArgs()
  const resolvedTeamPath = path.resolve(teamPath)
  const resolvedPropertiesPath = path.resolve(propertiesPath)

  const [teamCsv, propertiesCsv] = await Promise.all([
    fs.readFile(resolvedTeamPath, 'utf8'),
    fs.readFile(resolvedPropertiesPath, 'utf8'),
  ])

  const teamRecords = csvRecordsFromHeader(teamCsv, 'Name')
  const propertyRecords = csvRecordsFromHeader(propertiesCsv, 'Ref Number')

  const organization = await resolveOrgId(orgId)
  console.log(`[import] Organization: ${organization.name} (${organization.id})`)
  console.log(`[import] Team records in CSV: ${teamRecords.length}`)
  console.log(`[import] Property records in CSV: ${propertyRecords.length}`)

  const teamSummary = await importTeamMembers(organization.id, teamRecords)
  const teamDirectory = await fetchTeamDirectory(organization.id)
  const propertiesSummary = await importProperties(organization.id, propertyRecords, teamDirectory)

  console.log('')
  console.log('[import] Team members')
  console.log(`  inserted: ${teamSummary.inserted}`)
  console.log(`  updated:  ${teamSummary.updated}`)
  console.log(`  skipped:  ${teamSummary.skipped}`)
  console.log('[import] Properties')
  console.log(`  inserted: ${propertiesSummary.inserted}`)
  console.log(`  updated:  ${propertiesSummary.updated}`)
  console.log(`  skipped:  ${propertiesSummary.skipped}`)

  if (propertiesSummary.warnings.length > 0) {
    console.log('')
    console.log('[import] Warnings')
    for (const warning of propertiesSummary.warnings.slice(0, 20)) {
      console.log(`  - ${warning}`)
    }
    if (propertiesSummary.warnings.length > 20) {
      console.log(`  ... and ${propertiesSummary.warnings.length - 20} more`)
    }
  }

  console.log('')
  console.log('[import] Done.')
}

main().catch((error) => {
  console.error('[import] Failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
