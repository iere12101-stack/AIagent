'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarCheck,
  Clock,
  Mail,
  Megaphone,
  MessageSquare,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Smartphone,
  TrendingUp,
  UserPlus,
  Volume2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/store'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationCategoryPreference,
  type NotificationPreferenceCategoryId,
  type NotificationPreferencesRecord,
  type QuietHoursPreference,
  type SoundSettingsPreference,
} from '@/lib/notifications'

type ChannelKey = keyof NotificationCategoryPreference['channels']

const CHANNEL_CONFIG = [
  { key: 'email' as const, label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { key: 'push' as const, label: 'Push', icon: <Bell className="h-3.5 w-3.5" /> },
  { key: 'sms' as const, label: 'SMS', icon: <Smartphone className="h-3.5 w-3.5" /> },
  { key: 'desktop' as const, label: 'Desktop', icon: <Monitor className="h-3.5 w-3.5" /> },
]

const CATEGORY_ICONS: Record<NotificationPreferenceCategoryId, ReactNode> = {
  'new-conversations': <MessageSquare className="h-4 w-4 text-emerald-500" />,
  'lead-score-changes': <TrendingUp className="h-4 w-4 text-amber-500" />,
  'booking-updates': <CalendarCheck className="h-4 w-4 text-blue-500" />,
  'handoff-alerts': <UserPlus className="h-4 w-4 text-purple-500" />,
  'nudge-events': <Zap className="h-4 w-4 text-orange-500" />,
  'system-alerts': <AlertTriangle className="h-4 w-4 text-red-500" />,
  'marketing-updates': <Megaphone className="h-4 w-4 text-cyan-500" />,
}

async function fetchPreferences(): Promise<{ data: NotificationPreferencesRecord }> {
  const response = await fetch('/api/notification-preferences')
  if (!response.ok) {
    throw new Error('Failed to load notification preferences')
  }

  return response.json()
}

async function savePreferences(preferences: NotificationPreferencesRecord): Promise<void> {
  const response = await fetch('/api/notification-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    throw new Error('Failed to save notification preferences')
  }
}

function clonePreferences(preferences: NotificationPreferencesRecord): NotificationPreferencesRecord {
  return normalizeNotificationPreferences(preferences)
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {Array.from({ length: 4 }).map((__, innerIndex) => (
                <Skeleton key={innerIndex} className="h-5 w-20" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface SettingsNotificationsFormProps {
  initialPreferences: NotificationPreferencesRecord
  isSaving: boolean
  onSave: (preferences: NotificationPreferencesRecord) => void
  onBack: () => void
}

function SettingsNotificationsForm({
  initialPreferences,
  isSaving,
  onSave,
  onBack,
}: SettingsNotificationsFormProps) {
  const [categories, setCategories] = useState<NotificationCategoryPreference[]>(
    initialPreferences.categories,
  )
  const [quietHours, setQuietHours] = useState<QuietHoursPreference>(
    initialPreferences.quietHours,
  )
  const [soundSettings, setSoundSettings] = useState<SoundSettingsPreference>(
    initialPreferences.soundSettings,
  )

  const toggleChannel = (categoryId: string, channel: ChannelKey) => {
    setCategories((previous) =>
      previous.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              channels: {
                ...category.channels,
                [channel]: !category.channels[channel],
              },
            }
          : category,
      ),
    )
  }

  const handleReset = () => {
    const defaults = clonePreferences(DEFAULT_NOTIFICATION_PREFERENCES)
    setCategories(defaults.categories)
    setQuietHours(defaults.quietHours)
    setSoundSettings(defaults.soundSettings)
  }

  const draftPreferences: NotificationPreferencesRecord = {
    categories,
    quietHours,
    soundSettings,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-emerald-600" />
              Notification Preferences
            </h1>
          </div>
          <p className="text-muted-foreground ml-11">
            Manage how and when you receive notifications across different channels
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 p-4 sm:p-4 sm:pr-0 flex-1 min-w-0">
                  <div className="rounded-lg bg-muted p-2.5 shrink-0">
                    {CATEGORY_ICONS[category.id]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{category.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center border-t sm:border-t-0 sm:border-l divide-x">
                  {CHANNEL_CONFIG.map((channel) => (
                    <div
                      key={channel.key}
                      className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 flex-1 sm:flex-none sm:w-20"
                    >
                      <span className="text-muted-foreground">{channel.icon}</span>
                      <Switch
                        checked={category.channels[channel.key]}
                        onCheckedChange={() => toggleChannel(category.id, channel.key)}
                        className="data-[state=checked]:bg-emerald-600 scale-90"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {channel.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-indigo-500" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Suppress non-critical notifications during specified hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">
                Only system alerts will be delivered during quiet hours
              </p>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(checked) =>
                setQuietHours((previous) => ({ ...previous, enabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {quietHours.enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Select
                    value={quietHours.startTime}
                    onValueChange={(value) =>
                      setQuietHours((previous) => ({ ...previous, startTime: value }))
                    }
                  >
                    <SelectTrigger id="quiet-start" className="h-9 text-sm">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20:00">20:00 (8 PM)</SelectItem>
                      <SelectItem value="21:00">21:00 (9 PM)</SelectItem>
                      <SelectItem value="22:00">22:00 (10 PM)</SelectItem>
                      <SelectItem value="23:00">23:00 (11 PM)</SelectItem>
                      <SelectItem value="00:00">00:00 (Midnight)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Select
                    value={quietHours.endTime}
                    onValueChange={(value) =>
                      setQuietHours((previous) => ({ ...previous, endTime: value }))
                    }
                  >
                    <SelectTrigger id="quiet-end" className="h-9 text-sm">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00">06:00 (6 AM)</SelectItem>
                      <SelectItem value="07:00">07:00 (7 AM)</SelectItem>
                      <SelectItem value="08:00">08:00 (8 AM)</SelectItem>
                      <SelectItem value="09:00">09:00 (9 AM)</SelectItem>
                      <SelectItem value="10:00">10:00 (10 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Timezone</Label>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Asia/Dubai</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      Locked
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-emerald-500" />
            Notification Sounds
          </CardTitle>
          <CardDescription>
            Configure audio alerts for incoming notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Sounds</Label>
              <p className="text-xs text-muted-foreground">
                Play audio when notifications arrive
              </p>
            </div>
            <Switch
              checked={soundSettings.enabled}
              onCheckedChange={(checked) =>
                setSoundSettings((previous) => ({ ...previous, enabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {soundSettings.enabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Volume</Label>
                  <span className="text-sm font-semibold text-emerald-600">
                    {soundSettings.volume}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[soundSettings.volume]}
                    onValueChange={(value) =>
                      setSoundSettings((previous) => ({ ...previous, volume: value[0] ?? 0 }))
                    }
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Volume2 className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="sound-select" className="text-sm">
                  Notification Sound
                </Label>
                <Select
                  value={soundSettings.sound}
                  onValueChange={(value) =>
                    setSoundSettings((previous) => ({ ...previous, sound: value }))
                  }
                >
                  <SelectTrigger id="sound-select" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="ping">Ping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Default
        </button>
        <Button
          onClick={() => onSave(draftPreferences)}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[160px]"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SettingsNotificationsPage() {
  const queryClient = useQueryClient()
  const { setCurrentPage } = useAppStore()
  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Notification preferences saved', {
        description: 'Your alert channels and quiet hours are now up to date.',
      })
    },
    onError: () => {
      toast.error('Could not save notification preferences', {
        description: 'Please try again. Your previous settings are still intact.',
      })
    },
  })

  if (preferencesQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (preferencesQuery.isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage('settings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
            <p className="text-muted-foreground">
              The settings page is live, but this request failed. You can retry without leaving the page.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Preferences could not be loaded</p>
              <p className="text-sm text-muted-foreground">
                Check the API response and try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void preferencesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SettingsNotificationsForm
      key={preferencesQuery.dataUpdatedAt}
      initialPreferences={clonePreferences(preferencesQuery.data?.data ?? DEFAULT_NOTIFICATION_PREFERENCES)}
      isSaving={saveMutation.isPending}
      onSave={(preferences) => saveMutation.mutate(preferences)}
      onBack={() => setCurrentPage('settings')}
    />
  )
}
