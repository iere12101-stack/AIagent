import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { normalizeHandoffSettings } from '@/lib/organization-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const handoffSettingsSchema = z.object({
  autoHandoffEnabled: z.boolean(),
  sentimentAnalysisEnabled: z.boolean(),
  maxAiMessagesBeforePrompt: z.number().int().min(1).max(100),
  handoffDelaySeconds: z.number().int().min(0).max(3600),
  conditions: z.object({
    negativeSentiment: z.boolean(),
    explicitRequest: z.boolean(),
    priceNegotiation: z.boolean(),
    complexComparison: z.boolean(),
    maxMessageCount: z.boolean(),
  }),
  triggers: z.array(
    z.object({
      id: z.string().min(1),
      keyword: z.string().min(1),
      sentiment: z.enum(['negative', 'neutral', 'positive']),
      action: z.enum(['immediate_handoff', 'escalate', 'priority']),
      description: z.string().min(1),
    }),
  ),
  escalationRules: z.array(
    z.object({
      id: z.string().min(1),
      condition: z.string().min(1),
      level: z.enum(['low', 'medium', 'high']),
      action: z.string().min(1),
    }),
  ),
  sla: z.object({
    aiFirstResponseSeconds: z.number().int().min(1).max(3600),
    agentAcceptSeconds: z.number().int().min(1).max(7200),
    agentFirstReplySeconds: z.number().int().min(1).max(7200),
    escalationTimeoutSeconds: z.number().int().min(1).max(86400),
    resolutionTargetHours: z.number().int().min(1).max(168),
    afterHoursMode: z.enum(['auto-reply', 'queue', 'off']),
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
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.orgId)
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to load handoff settings', details: error?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const settings = isRecord(organization.settings) ? organization.settings : {}
    return NextResponse.json({ data: normalizeHandoffSettings(settings.handoff) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load handoff settings', details: String(error) },
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
    const payload = handoffSettingsSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid handoff settings payload', details: payload.error.flatten() },
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
        { error: 'Failed to load current handoff settings', details: readError?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const currentSettings = isRecord(organization.settings) ? organization.settings : {}
    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentSettings,
          handoff: payload.data,
        },
      })
      .eq('id', auth.orgId)
      .select('settings')
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: 'Failed to save handoff settings', details: updateError?.message ?? 'Unknown error' },
        { status: 500 },
      )
    }

    const nextSettings = isRecord(data.settings) ? data.settings : {}
    return NextResponse.json({ success: true, data: normalizeHandoffSettings(nextSettings.handoff) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save handoff settings', details: String(error) },
      { status: 500 },
    )
  }
}
