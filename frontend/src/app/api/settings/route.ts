import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import {
  normalizeGeneralSettings,
  normalizeHandoffSettings,
  normalizeApiSettings,
} from '@/lib/organization-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const updateGeneralSettingsSchema = z.object({
  organizationName: z.string().min(1),
  organizationSlug: z.string().min(1),
  timezone: z.string().min(1),
  language: z.enum(['en', 'ar']),
  whatsapp: z.object({
    maxRetries: z.number().int().min(1).max(10),
    propertySyncMinutes: z.number().int().min(5).max(120),
    nudge24h: z.boolean(),
    nudge72h: z.boolean(),
  }),
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
    const [{ data: organization, error }, { count: teamMembers }] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, slug, plan, settings')
        .eq('id', auth.orgId)
        .single(),
      supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('active', true),
    ])

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to load organization settings', details: error?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const settings = isRecord(organization.settings) ? organization.settings : {}
    const handoff = normalizeHandoffSettings(settings.handoff)
    const api = normalizeApiSettings(settings.api)

    return NextResponse.json({
      data: normalizeGeneralSettings(organization),
      summary: {
        teamMembers: teamMembers ?? 0,
        handoffTriggers: handoff.triggers.length,
        webhooks: api.webhooks.length,
        notifications: 7,
      },
      integrations: {
        claude: Boolean(
          process.env.ANTHROPIC_API_KEY ||
            process.env.CLAUDE_API_KEY ||
            process.env.ANTHROPIC_KEY ||
            process.env.CLAUDE_KEY,
        ),
        groq: Boolean(process.env.GROQ_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
        googleCalendar: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load organization settings', details: String(error) },
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
    const payload = updateGeneralSettingsSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid settings payload', details: payload.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    const { data: organization, error: readError } = await supabase
      .from('organizations')
      .select('settings, plan')
      .eq('id', auth.orgId)
      .single()

    if (readError || !organization) {
      return NextResponse.json(
        { error: 'Failed to load current organization settings', details: readError?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const currentSettings = isRecord(organization.settings) ? organization.settings : {}
    const currentWhatsapp = isRecord(currentSettings.whatsapp) ? currentSettings.whatsapp : {}

    const nextSettings = {
      ...currentSettings,
      timezone: payload.data.timezone,
      language: payload.data.language,
      whatsapp: {
        ...currentWhatsapp,
        ...payload.data.whatsapp,
      },
    }

    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({
        name: payload.data.organizationName,
        slug: payload.data.organizationSlug,
        settings: nextSettings,
      })
      .eq('id', auth.orgId)
      .select('name, slug, plan, settings')
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: 'Failed to save organization settings', details: updateError?.message ?? 'Unknown error' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: normalizeGeneralSettings(data) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save organization settings', details: String(error) },
      { status: 500 },
    )
  }
}
