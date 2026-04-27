'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  Code,
  Globe,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
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
import {
  type ApiSettingsRecord,
  type WebhookSettingsItem,
} from '@/lib/organization-settings'
import { useAppStore } from '@/lib/store'

interface ProviderStatus {
  id: string
  name: string
  description: string
  configured: boolean
}

interface ActivityItem {
  id: string
  type: string
  description: string
  status: string
  timestamp: string
}

interface ApiSettingsResponse {
  data: ApiSettingsRecord
  providers: ProviderStatus[]
  recentActivity: ActivityItem[]
}

async function fetchApiSettings(): Promise<ApiSettingsResponse> {
  const response = await fetch('/api/settings/api')
  if (!response.ok) {
    throw new Error('Failed to load API settings')
  }

  return response.json()
}

async function saveApiSettings(settings: ApiSettingsRecord): Promise<void> {
  const response = await fetch('/api/settings/api', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error('Failed to save API settings')
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  )
}

function ApiSettingsForm({
  initialSettings,
  recentActivity,
  isSaving,
  onSave,
}: {
  initialSettings: ApiSettingsRecord
  recentActivity: ActivityItem[]
  isSaving: boolean
  onSave: (settings: ApiSettingsRecord) => void
}) {
  const { setCurrentPage } = useAppStore()
  const [settings, setSettings] = useState<ApiSettingsRecord>({
    ...initialSettings,
    webhooks: initialSettings.webhooks.map((item) => ({ ...item })),
  })
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState('message.received, handoff.created')

  const addWebhook = () => {
    const url = newWebhookUrl.trim()
    const events = newWebhookEvents
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (!url || events.length === 0) {
      toast.error('Add a valid webhook URL and at least one event')
      return
    }

    try {
      new URL(url)
    } catch {
      toast.error('Webhook URL must be valid')
      return
    }

    setSettings((current) => ({
      ...current,
      webhooks: [
        ...current.webhooks,
        {
          id: crypto.randomUUID(),
          url,
          events,
          status: 'active',
          lastDeliveredAt: null,
        },
      ],
    }))
    setNewWebhookUrl('')
  }

  const updateWebhook = (webhookId: string, updates: Partial<WebhookSettingsItem>) => {
    setSettings((current) => ({
      ...current,
      webhooks: current.webhooks.map((webhook) =>
        webhook.id === webhookId ? { ...webhook, ...updates } : webhook,
      ),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage('settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Code className="h-6 w-6 text-emerald-500" />
            API & Webhooks
          </h1>
          <p className="text-muted-foreground">Manage webhook delivery, API safety, and platform activity</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>Persisted org-scoped endpoints for outbound event delivery</CardDescription>
            </div>
            <Badge variant="outline">{settings.webhooks.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.webhooks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No webhook endpoints have been configured yet.
            </div>
          ) : (
            settings.webhooks.map((webhook) => (
              <div key={webhook.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                    <Input
                      value={webhook.url}
                      onChange={(event) => updateWebhook(webhook.id, { url: event.target.value })}
                    />
                  </div>
                  <div className="w-full lg:w-[180px] space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={webhook.status}
                      onValueChange={(value: 'active' | 'inactive') => updateWebhook(webhook.id, { status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          webhooks: current.webhooks.filter((item) => item.id !== webhook.id),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Subscribed events</Label>
                  <Input
                    value={webhook.events.join(', ')}
                    onChange={(event) =>
                      updateWebhook(webhook.id, {
                        events: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last delivery:{' '}
                  {webhook.lastDeliveredAt
                    ? new Date(webhook.lastDeliveredAt).toLocaleString('en-US')
                    : 'No delivery recorded yet'}
                </p>
              </div>
            ))
          )}

          <Separator />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="new-webhook-url">New webhook URL</Label>
              <Input
                id="new-webhook-url"
                value={newWebhookUrl}
                onChange={(event) => setNewWebhookUrl(event.target.value)}
                placeholder="https://example.com/hooks/iore"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-webhook-events">Events</Label>
              <Input
                id="new-webhook-events"
                value={newWebhookEvents}
                onChange={(event) => setNewWebhookEvents(event.target.value)}
                placeholder="message.received, booking.created"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="gap-1.5" onClick={addWebhook}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Retry failed webhooks</p>
              <p className="text-xs text-muted-foreground">Retry delivery automatically when an endpoint returns an error</p>
            </div>
            <Switch
              checked={settings.webhookRetry}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, webhookRetry: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Rate Limiting
            </CardTitle>
            <CardDescription>Organization-level API safety thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable rate limiting</p>
                <p className="text-xs text-muted-foreground">Protect internal and external endpoints from abuse</p>
              </div>
              <Switch
                checked={settings.rateLimitEnabled}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({ ...current, rateLimitEnabled: checked }))
                }
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Requests per minute</Label>
              <Input
                type="number"
                value={settings.requestsPerMinute}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    requestsPerMinute: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Requests per hour</Label>
              <Input
                type="number"
                value={settings.requestsPerHour}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    requestsPerHour: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Burst limit</Label>
              <Input
                type="number"
                value={settings.burstLimit}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    burstLimit: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              API Documentation
            </CardTitle>
            <CardDescription>Reference entry point for internal platform APIs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">Docs route</p>
                  <p className="text-xs text-muted-foreground">{settings.docsUrl}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(settings.docsUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider keys stay server-side and are not exposed here. This page only shows readiness and org-level webhook policy.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4" />
                Recent Platform Activity
              </CardTitle>
              <CardDescription>Latest stored events from messaging, nudges, bookings, and handoffs</CardDescription>
            </div>
            <Badge variant="outline">{recentActivity.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No platform activity has been recorded yet.
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activity.type}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        activity.status === 'processed' || activity.status === 'active' || activity.status === 'scheduled'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : activity.status === 'pending'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button
          onClick={() => onSave(settings)}
          disabled={isSaving}
          className="min-w-[180px] gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save API Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SettingsAPIPage() {
  const queryClient = useQueryClient()
  const apiQuery = useQuery({
    queryKey: ['settings-api'],
    queryFn: fetchApiSettings,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: saveApiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-api'] })
      queryClient.invalidateQueries({ queryKey: ['settings-general'] })
      toast.success('API settings saved', {
        description: 'Webhook and rate-limit changes are now stored for this organization.',
      })
    },
    onError: () => {
      toast.error('Could not save API settings', {
        description: 'Please check the webhook URLs and try again.',
      })
    },
  })

  if (apiQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (apiQuery.isError || !apiQuery.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="font-medium">API settings could not be loaded</p>
          <p className="text-sm text-muted-foreground">
            The org-scoped API settings route did not respond successfully.
          </p>
          <Button variant="outline" onClick={() => void apiQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <ApiSettingsForm
      key={apiQuery.dataUpdatedAt}
      initialSettings={apiQuery.data.data}
      recentActivity={apiQuery.data.recentActivity}
      isSaving={saveMutation.isPending}
      onSave={(settings) => saveMutation.mutate(settings)}
    />
  )
}
