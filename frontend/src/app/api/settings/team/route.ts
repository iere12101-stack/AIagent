import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { normalizeTeamSettings } from '@/lib/organization-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const teamSettingsSchema = z.object({
  defaultHandoffAgentId: z.string().uuid().nullable(),
  autoAssignEnabled: z.boolean(),
  roundRobinEnabled: z.boolean(),
  assignmentPriority: z.enum(['area-expert', 'round-robin', 'least-busy', 'lead-score']),
})

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const [{ data: organization, error }, { data: teamMembers, error: teamError }] = await Promise.all([
      supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.orgId)
        .single(),
      supabase
        .from('team_members')
        .select('id, name, role, active')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: true }),
    ])

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to load team settings', details: error?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    if (teamError) {
      return NextResponse.json(
        { error: 'Failed to load team members', details: teamError.message },
        { status: 500 },
      )
    }

    const settings = isRecord(organization.settings) ? organization.settings : {}
    return NextResponse.json({
      data: normalizeTeamSettings(settings.team),
      teamMembers: teamMembers ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load team settings', details: String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = teamSettingsSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid team settings payload', details: payload.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    const { data: organization, error: readError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.orgId)
      .single()

    if (readError || !organization) {
      return NextResponse.json(
        { error: 'Failed to load current team settings', details: readError?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const currentSettings = isRecord(organization.settings) ? organization.settings : {}
    const { error: updateError, data } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentSettings,
          team: payload.data,
        },
      })
      .eq('id', auth.orgId)
      .select('settings')
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: 'Failed to save team settings', details: updateError?.message ?? 'Unknown error' },
        { status: 500 },
      )
    }

    const nextSettings = isRecord(data.settings) ? data.settings : {}
    return NextResponse.json({ success: true, data: normalizeTeamSettings(nextSettings.team) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save team settings', details: String(error) },
      { status: 500 },
    )
  }
}
