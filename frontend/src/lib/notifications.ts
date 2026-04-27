function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type NotificationPreferenceCategoryId =
  | 'new-conversations'
  | 'lead-score-changes'
  | 'booking-updates'
  | 'handoff-alerts'
  | 'nudge-events'
  | 'system-alerts'
  | 'marketing-updates'

export interface NotificationCategoryChannels {
  email: boolean
  push: boolean
  sms: boolean
  desktop: boolean
}

export interface NotificationCategoryPreference {
  id: NotificationPreferenceCategoryId
  name: string
  description: string
  channels: NotificationCategoryChannels
}

export interface QuietHoursPreference {
  enabled: boolean
  startTime: string
  endTime: string
}

export interface SoundSettingsPreference {
  enabled: boolean
  volume: number
  sound: string
}

export interface NotificationPreferencesRecord {
  categories: NotificationCategoryPreference[]
  quietHours: QuietHoursPreference
  soundSettings: SoundSettingsPreference
}

export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategoryPreference[] = [
  {
    id: 'new-conversations',
    name: 'New Conversations',
    description: 'Get notified when a new WhatsApp conversation is started',
    channels: { email: true, push: true, sms: false, desktop: true },
  },
  {
    id: 'lead-score-changes',
    name: 'Lead Score Changes',
    description: 'Alerts when contact lead scores change significantly',
    channels: { email: true, push: false, sms: false, desktop: true },
  },
  {
    id: 'booking-updates',
    name: 'Booking Updates',
    description: 'Notifications for new, confirmed, completed, or cancelled bookings',
    channels: { email: true, push: true, sms: true, desktop: true },
  },
  {
    id: 'handoff-alerts',
    name: 'Handoff Alerts',
    description: 'Notify when AI hands off a conversation to a human agent',
    channels: { email: true, push: true, sms: false, desktop: true },
  },
  {
    id: 'nudge-events',
    name: 'Nudge Events',
    description: 'Updates on automated follow-up nudge delivery and engagement',
    channels: { email: false, push: true, sms: false, desktop: false },
  },
  {
    id: 'system-alerts',
    name: 'System Alerts',
    description: 'Critical system notifications, device disconnections, and errors',
    channels: { email: true, push: true, sms: true, desktop: true },
  },
  {
    id: 'marketing-updates',
    name: 'Marketing Updates',
    description: 'Product announcements, feature updates, and tips',
    channels: { email: true, push: false, sms: false, desktop: false },
  },
]

export const DEFAULT_QUIET_HOURS: QuietHoursPreference = {
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
}

export const DEFAULT_SOUND_SETTINGS: SoundSettingsPreference = {
  enabled: true,
  volume: 50,
  sound: 'default',
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesRecord = {
  categories: DEFAULT_NOTIFICATION_CATEGORIES.map((category) => ({
    ...category,
    channels: { ...category.channels },
  })),
  quietHours: { ...DEFAULT_QUIET_HOURS },
  soundSettings: { ...DEFAULT_SOUND_SETTINGS },
}

function normalizeChannels(value: unknown, fallback: NotificationCategoryChannels): NotificationCategoryChannels {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    email: typeof value.email === 'boolean' ? value.email : fallback.email,
    push: typeof value.push === 'boolean' ? value.push : fallback.push,
    sms: typeof value.sms === 'boolean' ? value.sms : fallback.sms,
    desktop: typeof value.desktop === 'boolean' ? value.desktop : fallback.desktop,
  }
}

export function normalizeNotificationCategories(value: unknown): NotificationCategoryPreference[] {
  const incoming = Array.isArray(value) ? value : []

  return DEFAULT_NOTIFICATION_CATEGORIES.map((category) => {
    const match = incoming.find(
      (candidate) => isRecord(candidate) && candidate.id === category.id,
    )

    return {
      ...category,
      channels: normalizeChannels(isRecord(match) ? match.channels : undefined, category.channels),
    }
  })
}

export function normalizeQuietHours(value: unknown): QuietHoursPreference {
  if (!isRecord(value)) {
    return { ...DEFAULT_QUIET_HOURS }
  }

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_QUIET_HOURS.enabled,
    startTime:
      typeof value.startTime === 'string' ? value.startTime : DEFAULT_QUIET_HOURS.startTime,
    endTime:
      typeof value.endTime === 'string' ? value.endTime : DEFAULT_QUIET_HOURS.endTime,
  }
}

export function normalizeSoundSettings(value: unknown): SoundSettingsPreference {
  if (!isRecord(value)) {
    return { ...DEFAULT_SOUND_SETTINGS }
  }

  const volume =
    typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? Math.min(100, Math.max(0, value.volume))
      : DEFAULT_SOUND_SETTINGS.volume

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_SOUND_SETTINGS.enabled,
    volume,
    sound: typeof value.sound === 'string' ? value.sound : DEFAULT_SOUND_SETTINGS.sound,
  }
}

export function normalizeNotificationPreferences(
  value: Partial<NotificationPreferencesRecord> | null | undefined,
): NotificationPreferencesRecord {
  return {
    categories: normalizeNotificationCategories(value?.categories),
    quietHours: normalizeQuietHours(value?.quietHours),
    soundSettings: normalizeSoundSettings(value?.soundSettings),
  }
}
