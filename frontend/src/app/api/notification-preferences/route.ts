import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/authenticate'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferencesRecord,
} from '@/lib/notifications'

const channelsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
  desktop: z.boolean(),
})

const categoryIdSchema = z.enum([
  'new-conversations',
  'lead-score-changes',
  'booking-updates',
  'handoff-alerts',
  'nudge-events',
  'system-alerts',
  'marketing-updates',
])

const categorySchema = z.object({
  id: categoryIdSchema,
  name: z.string(),
  description: z.string(),
  channels: channelsSchema,
})

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
})

const soundSettingsSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(100),
  sound: z.string(),
})

const putSchema = z.object({
  categories: z.array(categorySchema),
  quietHours: quietHoursSchema,
  soundSettings: soundSettingsSchema,
})

function buildPreferenceRow(
  userId: string,
  orgId: string,
  preferences: NotificationPreferencesRecord,
) {
  const hasEmail = preferences.categories.some((category) => category.channels.email)
  const hasSms = preferences.categories.some((category) => category.channels.sms)
  const hasPush =
    preferences.categories.some((category) => category.channels.push)
    || preferences.categories.some((category) => category.channels.desktop)

  return {
    org_id: orgId,
    user_id: userId,
    whatsapp: { enabled: true },
    email: { enabled: hasEmail, immediate: true },
    sms: { enabled: hasSms, urgent_only: true },
    push: { enabled: hasPush },
    categories: preferences.categories,
    quiet_hours: preferences.quietHours,
    sound_settings: preferences.soundSettings,
    updated_at: new Date().toISOString(),
  }
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
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('categories, quiet_hours, sound_settings')
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences', details: error.message },
        { status: 500 },
      )
    }

    if (!data) {
      const row = buildPreferenceRow(auth.userId, auth.orgId, DEFAULT_NOTIFICATION_PREFERENCES)
      const { error: insertError } = await supabase
        .from('notification_preferences')
        .insert(row)

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to initialize notification preferences', details: insertError.message },
          { status: 500 },
        )
      }

      return NextResponse.json({ data: DEFAULT_NOTIFICATION_PREFERENCES })
    }

    return NextResponse.json({
      data: normalizeNotificationPreferences({
        categories: data.categories,
        quietHours: data.quiet_hours,
        soundSettings: data.sound_settings,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences', details: String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(request)
  } catch (err) {
    if (err instanceof Response) return err as NextResponse
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = putSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: payload.error.flatten() },
        { status: 400 },
      )
    }

    const preferences = normalizeNotificationPreferences(payload.data)
    const supabase = createServerClient()
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(buildPreferenceRow(auth.userId, auth.orgId, preferences), {
        onConflict: 'user_id',
      })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save notification preferences', details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: preferences })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save notification preferences', details: String(error) },
      { status: 500 },
    )
  }
}
