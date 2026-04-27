import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import {
  getPlanLimits,
  getPlanPriceAed,
  normalizeBillingSettings,
} from '@/lib/organization-settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const monthStartIso = monthStart.toISOString()

    const [{ data: organization, error }, { count: messagesUsed }, { count: aiCallsUsed }, { count: contactsUsed }, { count: devicesUsed }] = await Promise.all([
      supabase
        .from('organizations')
        .select('plan, settings')
        .eq('id', auth.orgId)
        .single(),
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .gte('created_at', monthStartIso),
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('sender_type', 'ai')
        .gte('created_at', monthStartIso),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId),
      supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', auth.orgId),
    ])

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Failed to load billing settings', details: error?.message ?? 'Not found' },
        { status: 500 },
      )
    }

    const settings = isRecord(organization.settings) ? organization.settings : {}
    const billingSettings = normalizeBillingSettings(settings.billing)
    const limits = getPlanLimits(organization.plan)
    const renewalDate =
      isRecord(settings.billing) && typeof settings.billing.renewalDate === 'string'
        ? settings.billing.renewalDate
        : null

    return NextResponse.json({
      data: {
        plan: organization.plan,
        priceAed: getPlanPriceAed(organization.plan),
        renewalDate,
        usage: {
          messages: { used: messagesUsed ?? 0, limit: limits.messages },
          contacts: { used: contactsUsed ?? 0, limit: limits.contacts },
          aiCalls: { used: aiCallsUsed ?? 0, limit: limits.aiCalls },
          devices: { used: devicesUsed ?? 0, limit: limits.devices },
        },
        stripePortalUrl: billingSettings.stripePortalUrl,
        paymentMethod: billingSettings.paymentMethod,
        history: billingSettings.history,
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load billing settings', details: String(error) },
      { status: 500 },
    )
  }
}
