import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { toCamelCase } from '@/lib/helpers'

const teamMemberCreateSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum(['CEO', 'Sales Manager', 'Agent', 'Receptionist']),
  whatsapp: z.string().min(6).max(30),
  email: z.string().email().max(200),
  areaSpeciality: z.array(z.string().min(1).max(120)).default([]),
  budgetThresholdAed: z.number().nonnegative().nullable().optional(),
  active: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
  routeTo: z.enum(['VIP', 'HOT', 'WARM', 'SUPPORT']).optional(),
})

function defaultRouteForRole(role: z.infer<typeof teamMemberCreateSchema>['role']): 'VIP' | 'HOT' | 'WARM' | 'SUPPORT' {
  if (role === 'CEO') return 'VIP'
  if (role === 'Sales Manager') return 'HOT'
  if (role === 'Receptionist') return 'SUPPORT'
  return 'WARM'
}

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()

    const { data: team, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fetch team error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team members', details: error.message },
        { status: 500 }
      )
    }

    const normalized = (team ?? []).map((member) => {
      const item = toCamelCase(member as Record<string, unknown>) as Record<string, unknown>
      const specialityAreas = Array.isArray(member.speciality_areas) && member.speciality_areas.length > 0
        ? member.speciality_areas
        : Array.isArray(member.area_speciality)
          ? member.area_speciality
          : []

      item.phone = member.whatsapp
      item.specialityAreas = JSON.stringify(specialityAreas)
      item.areaSpeciality = specialityAreas
      item.minBudget = member.min_budget_aed ?? member.budget_threshold_aed ?? null
      item.minBudgetAed = member.min_budget_aed ?? member.budget_threshold_aed ?? null
      item.routeTo = member.route_to ?? null

      return item
    })

    return NextResponse.json({ data: normalized })
  } catch (error) {
    console.error('GET /api/team error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsedPayload = teamMemberCreateSchema.safeParse(await request.json())
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid team member payload',
          code: 'VALIDATION_ERROR',
          details: parsedPayload.error.flatten(),
        },
        { status: 400 },
      )
    }

    const payload = parsedPayload.data
    const supabase = createServerClient()
    const speciality = payload.areaSpeciality.map((item) => item.trim()).filter(Boolean)

    const insertRecord = {
      org_id: auth.orgId,
      name: payload.name.trim(),
      role: payload.role,
      whatsapp: payload.whatsapp.trim(),
      email: payload.email.trim().toLowerCase(),
      area_speciality: speciality,
      speciality_areas: speciality,
      budget_threshold_aed: payload.budgetThresholdAed ?? null,
      min_budget_aed: payload.budgetThresholdAed ?? null,
      active: payload.active,
      notes: payload.notes ?? null,
      route_to: payload.routeTo ?? defaultRouteForRole(payload.role),
    }

    const { data: created, error } = await supabase
      .from('team_members')
      .insert(insertRecord)
      .select('*')
      .single()

    if (error || !created) {
      return NextResponse.json(
        { success: false, error: error?.message ?? 'Failed to create team member', code: 'DB_INSERT_FAILED' },
        { status: 500 },
      )
    }

    const item = toCamelCase(created as Record<string, unknown>) as Record<string, unknown>
    const specialityAreas = Array.isArray(created.speciality_areas) && created.speciality_areas.length > 0
      ? created.speciality_areas
      : Array.isArray(created.area_speciality)
        ? created.area_speciality
        : []

    item.phone = created.whatsapp
    item.specialityAreas = JSON.stringify(specialityAreas)
    item.areaSpeciality = specialityAreas
    item.minBudget = created.min_budget_aed ?? created.budget_threshold_aed ?? null
    item.minBudgetAed = created.min_budget_aed ?? created.budget_threshold_aed ?? null
    item.routeTo = created.route_to ?? null

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create team member', code: 'UNEXPECTED_ERROR', details: String(error) },
      { status: 500 },
    )
  }
}
