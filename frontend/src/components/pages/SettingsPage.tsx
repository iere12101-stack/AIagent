'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRightLeft,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  CreditCard,
  MessageSquare,
  Save,
  Settings,
  Shield,
  Users,
  Webhook,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type GeneralSettingsRecord,
} from '@/lib/organization-settings'
import { useAppStore } from '@/lib/store'

interface GeneralSettingsPayload {
  data: GeneralSettingsRecord
  summary: {
    teamMembers: number
    handoffTriggers: number
    webhooks: number
    notifications: number
  }
  integrations: {
    claude: boolean
    groq: boolean
    openai: boolean
    resend: boolean
    googleCalendar: boolean
    stripe: boolean
    supabase: boolean
  }
}

async function fetchGeneralSettings(): Promise<GeneralSettingsPayload> {
  const response = await fetch('/api/settings')
  if (!response.ok) {
    throw new Error('Failed to load settings')
  }

  return response.json()
}

async function saveGeneralSettings(settings: Omit<GeneralSettingsRecord, 'plan'>): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error('Failed to save settings')
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SettingsForm({
  initialSettings,
  summary,
  isSaving,
  onSave,
}: {
  initialSettings: GeneralSettingsRecord
  summary: GeneralSettingsPayload['summary']
  isSaving: boolean
  onSave: (settings: Omit<GeneralSettingsRecord, 'plan'>) => void
}) {
  const { setCurrentPage } = useAppStore()
  const [settings, setSettings] = useState<Omit<GeneralSettingsRecord, 'plan'>>({
    organizationName: initialSettings.organizationName,
    organizationSlug: initialSettings.organizationSlug,
    timezone: initialSettings.timezone,
    language: initialSettings.language,
    whatsapp: { ...initialSettings.whatsapp },
  })

  const subSettings = [
    {
      title: 'Team Management',
      description: 'Manage team members, roles, permissions, and auto-assignment rules',
      icon: <Users className="h-5 w-5 text-blue-500" />,
      page: 'settings-team' as const,
      badge: `${summary.teamMembers} members`,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Handoff & Escalation',
      description: 'Configure AI-to-human handoff triggers and SLA thresholds',
      icon: <ArrowRightLeft className="h-5 w-5 text-purple-500" />,
      page: 'settings-handoff' as const,
      badge: `${summary.handoffTriggers} triggers`,
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Billing & Subscription',
      description: 'Review usage, invoices, and Stripe subscription settings',
      icon: <CreditCard className="h-5 w-5 text-amber-500" />,
      page: 'settings-billing' as const,
      badge: initialSettings.plan.toUpperCase(),
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'API & Webhooks',
      description: 'Manage webhooks, rate limits, and provider readiness',
      icon: <Webhook className="h-5 w-5 text-emerald-500" />,
      page: 'settings-api' as const,
      badge: `${summary.webhooks} webhooks`,
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Notifications',
      description: 'Configure alert channels, quiet hours, and escalation delivery',
      icon: <Bell className="h-5 w-5 text-cyan-500" />,
      page: 'settings-notifications' as const,
      badge: `${summary.notifications} categories`,
      badgeColor: 'bg-cyan-100 text-cyan-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-display">
          <Settings className="h-6 w-6 text-emerald-600" />
          Settings
        </h1>
        <p className="text-muted-foreground">Configure your organization and automation preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-[600px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team" onClick={() => setCurrentPage('settings-team')}>Team</TabsTrigger>
          <TabsTrigger value="handoff" onClick={() => setCurrentPage('settings-handoff')}>Handoff</TabsTrigger>
          <TabsTrigger value="billing" onClick={() => setCurrentPage('settings-billing')}>Billing</TabsTrigger>
          <TabsTrigger value="api" onClick={() => setCurrentPage('settings-api')}>API</TabsTrigger>
          <TabsTrigger value="notifications" onClick={() => setCurrentPage('settings-notifications')}>Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Organization
              </CardTitle>
              <CardDescription>Basic organization details and tenant defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={settings.organizationName}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        organizationName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-slug">Organization Slug</Label>
                  <Input
                    id="org-slug"
                    value={settings.organizationSlug}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        organizationSlug: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border bg-amber-50 px-3">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">
                      {initialSettings.plan.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        timezone: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value: 'en' | 'ar') =>
                      setSettings((current) => ({
                        ...current,
                        language: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                WhatsApp Automation
              </CardTitle>
              <CardDescription>Self-heal, property sync cadence, and nudge automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Self-Heal Retry Limit</Label>
                  <Select
                    value={String(settings.whatsapp.maxRetries)}
                    onValueChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        whatsapp: {
                          ...current.whatsapp,
                          maxRetries: Number(value),
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 retry</SelectItem>
                      <SelectItem value="2">2 retries</SelectItem>
                      <SelectItem value="3">3 retries</SelectItem>
                      <SelectItem value="5">5 retries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Property Sync Interval</Label>
                  <Select
                    value={String(settings.whatsapp.propertySyncMinutes)}
                    onValueChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        whatsapp: {
                          ...current.whatsapp,
                          propertySyncMinutes: Number(value),
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">24-hour nudge</p>
                    <p className="text-xs text-muted-foreground">
                      Schedule the first follow-up for warm and hot leads
                    </p>
                  </div>
                  <Switch
                    checked={settings.whatsapp.nudge24h}
                    onCheckedChange={(checked) =>
                      setSettings((current) => ({
                        ...current,
                        whatsapp: {
                          ...current.whatsapp,
                          nudge24h: checked,
                        },
                      }))
                    }
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">72-hour fallback nudge</p>
                    <p className="text-xs text-muted-foreground">
                      Send the second follow-up if the lead remains inactive
                    </p>
                  </div>
                  <Switch
                    checked={settings.whatsapp.nudge72h}
                    onCheckedChange={(checked) =>
                      setSettings((current) => ({
                        ...current,
                        whatsapp: {
                          ...current.whatsapp,
                          nudge72h: checked,
                        },
                      }))
                    }
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  onClick={() => onSave(settings)}
                  disabled={isSaving}
                  className="min-w-[160px] gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Settings
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {subSettings.map((setting) => (
                <Card
                  key={setting.page}
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setCurrentPage(setting.page)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2.5 shrink-0">
                        {setting.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{setting.title}</h4>
                          <Badge variant="outline" className={`text-[10px] ${setting.badgeColor}`}>
                            {setting.badge}
                          </Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings-general'],
    queryFn: fetchGeneralSettings,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: saveGeneralSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-general'] })
      toast.success('Settings saved', {
        description: 'Organization and automation preferences are up to date.',
      })
    },
    onError: () => {
      toast.error('Could not save settings', {
        description: 'Please try again. Your existing settings were not changed.',
      })
    },
  })

  if (settingsQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Settings could not be loaded</p>
            <p className="text-sm text-muted-foreground">
              The page is live, but this request failed. Retry once the API is available.
            </p>
          </div>
          <Button variant="outline" onClick={() => void settingsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <SettingsForm
      key={settingsQuery.dataUpdatedAt}
      initialSettings={settingsQuery.data.data}
      summary={settingsQuery.data.summary}
      isSaving={saveMutation.isPending}
      onSave={(settings) => saveMutation.mutate(settings)}
    />
  )
}
