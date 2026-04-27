import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import { normalizeApiSettings } from '@/lib/organization-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const apiSettingsSchema = z.object({
  webhookRetry: z.boolean(),
  webhooks: z.array(
    z.object({
      id: z.string().min(1),
      url: z.string().url(),
      events: z.array(z.string().min(1)).min(1),
      status: z.enum(['active', 'inactive']),
      lastDeliveredAt: z.string().nullable(),
    }),
  ),
  rateLimitEnabled: z.boolean(),
  requestsPerMinute: z.number().int().min(1).max(100000),
  requestsPerHour: z.number().int().min(1).max(1000000),
  burstLimit: z.number().int().min(1).max(100000),
  docsUrl: z.string().min(1),
})

interface ActivityItem {
  id: string
  type: string
  description: string
  status: string
  timestamp: string
}

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
    const [{ data: organization, error }, { data: messages }, { data: bookings }, { data: nudges }, { data: handoffs }] = await Promise.all([
      supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.orgId)
        .single(),
      supabase
        .from('messages')
        .select('id, sender_type, direction, created_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('bookings')
        .select('id, status, property_ref, scheduled_date, created_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('nudge_jobs')
        .select('id, status, nudge_type, updated_at, created_at')
        .eq('org_id', auth.orgId)
        .order('updated_at', { ascending: false })
        .limit(3),
      supabase
        .from('handoff_events')
        .select('id, status, trigger_value, created_at')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to load API settings', details: error?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const settings = isRecord(organization.settings) ? organization.settings : {}
    const apiSettings = normalizeApiSettings(settings.api)

    const recentActivity: ActivityItem[] = [
      ...(messages ?? []).map((item) => ({
        id: `message-${item.id}`,
        type: 'message',
        description: `${item.direction === 'outbound' ? 'Outbound' : 'Inbound'} ${item.sender_type} message stored`,
        status: 'processed',
        timestamp: item.created_at,
      })),
      ...(bookings ?? []).map((item) => ({
        id: `booking-${item.id}`,
        type: 'booking',
        description: `Booking ${item.status} for ${item.property_ref ?? 'property enquiry'}`,
        status: item.status,
        timestamp: item.created_at,
      })),
      ...(nudges ?? []).map((item) => ({
        id: `nudge-${item.id}`,
        type: 'nudge',
        description: `${item.nudge_type} nudge ${item.status}`,
        status: item.status,
        timestamp: item.updated_at ?? item.created_at,
      })),
      ...(handoffs ?? []).map((item) => ({
        id: `handoff-${item.id}`,
        type: 'handoff',
        description: `Handoff ${item.status}${item.trigger_value ? ` from ${item.trigger_value}` : ''}`,
        status: item.status,
        timestamp: item.created_at,
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({
      data: apiSettings,
      providers: [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          description: 'Primary AI provider for live WhatsApp replies',
          configured: Boolean(
            process.env.ANTHROPIC_API_KEY ||
              process.env.CLAUDE_API_KEY ||
              process.env.ANTHROPIC_KEY ||
              process.env.CLAUDE_KEY,
          ),
        },
        {
          id: 'groq',
          name: 'Groq',
          description: 'Fallback model provider for degraded mode',
          configured: Boolean(process.env.GROQ_API_KEY),
        },
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'Embeddings and final AI fallback provider',
          configured: Boolean(process.env.OPENAI_API_KEY),
        },
        {
          id: 'resend',
          name: 'Resend',
          description: 'Email delivery for alerts and escalation notices',
          configured: Boolean(process.env.RESEND_API_KEY),
        },
        {
          id: 'stripe',
          name: 'Stripe',
          description: 'Billing portal and subscription management',
          configured: Boolean(process.env.STRIPE_SECRET_KEY),
        },
        {
          id: 'google-calendar',
          name: 'Google Calendar',
          description: 'Viewing bookings in Asia/Dubai timezone',
          configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        },
      ],
      recentActivity,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load API settings', details: String(error) },
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
    const payload = apiSettingsSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid API settings payload', details: payload.error.flatten() },
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
        { error: 'Failed to load current API settings', details: readError?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const currentSettings = isRecord(organization.settings) ? organization.settings : {}
    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentSettings,
          api: payload.data,
        },
      })
      .eq('id', auth.orgId)
      .select('settings')
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: 'Failed to save API settings', details: updateError?.message ?? 'Unknown error' },
        { status: 500 },
      )
    }

    const nextSettings = isRecord(data.settings) ? data.settings : {}
    return NextResponse.json({ success: true, data: normalizeApiSettings(nextSettings.api) })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save API settings', details: String(error) },
      { status: 500 },
    )
  }
}
