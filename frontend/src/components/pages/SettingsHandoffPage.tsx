'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Brain,
  Clock,
  Heart,
  MessageSquare,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Zap,
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
  type EscalationRule,
  type HandoffSettingsRecord,
  type HandoffTrigger,
} from '@/lib/organization-settings'
import { useAppStore } from '@/lib/store'

interface HandoffSettingsResponse {
  data: HandoffSettingsRecord
}

async function fetchHandoffSettings(): Promise<HandoffSettingsResponse> {
  const response = await fetch('/api/settings/handoff')
  if (!response.ok) {
    throw new Error('Failed to load handoff settings')
  }

  return response.json()
}

async function saveHandoffSettings(settings: HandoffSettingsRecord): Promise<void> {
  const response = await fetch('/api/settings/handoff', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error('Failed to save handoff settings')
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  )
}

function HandoffSettingsForm({
  initialSettings,
  isSaving,
  onSave,
}: {
  initialSettings: HandoffSettingsRecord
  isSaving: boolean
  onSave: (settings: HandoffSettingsRecord) => void
}) {
  const { setCurrentPage } = useAppStore()
  const [settings, setSettings] = useState<HandoffSettingsRecord>({
    ...initialSettings,
    conditions: { ...initialSettings.conditions },
    triggers: initialSettings.triggers.map((item) => ({ ...item })),
    escalationRules: initialSettings.escalationRules.map((item) => ({ ...item })),
    sla: { ...initialSettings.sla },
  })

  const updateTrigger = (triggerId: string, field: keyof HandoffTrigger, value: string) => {
    setSettings((current) => ({
      ...current,
      triggers: current.triggers.map((trigger) =>
        trigger.id === triggerId ? { ...trigger, [field]: value } : trigger,
      ),
    }))
  }

  const updateEscalationRule = (ruleId: string, field: keyof EscalationRule, value: string) => {
    setSettings((current) => ({
      ...current,
      escalationRules: current.escalationRules.map((rule) =>
        rule.id === ruleId ? { ...rule, [field]: value } : rule,
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
            <ArrowRightLeft className="h-6 w-6 text-purple-500" />
            Handoff Settings
          </h1>
          <p className="text-muted-foreground">Configure escalation rules, triggers, and response-time targets</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Auto-Handoff Configuration
          </CardTitle>
          <CardDescription>Control when AI should pause and transfer the conversation to a human</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable auto-handoff</p>
              <p className="text-xs text-muted-foreground">Turn automated escalation rules on or off</p>
            </div>
            <Switch
              checked={settings.autoHandoffEnabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, autoHandoffEnabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable sentiment analysis</p>
              <p className="text-xs text-muted-foreground">Run sentiment checks before AI replies</p>
            </div>
            <Switch
              checked={settings.sentimentAnalysisEnabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, sentimentAnalysisEnabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Max AI messages before prompt</Label>
              <Input
                type="number"
                value={settings.maxAiMessagesBeforePrompt}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maxAiMessagesBeforePrompt: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Handoff delay (seconds)</Label>
              <Input
                type="number"
                value={settings.handoffDelaySeconds}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    handoffDelaySeconds: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Escalation conditions</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                {
                  key: 'negativeSentiment' as const,
                  label: 'Negative sentiment detected',
                  icon: <Heart className="h-3.5 w-3.5 text-red-500" />,
                },
                {
                  key: 'explicitRequest' as const,
                  label: 'Explicit request for a human',
                  icon: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
                },
                {
                  key: 'priceNegotiation' as const,
                  label: 'Price negotiation beyond AI authority',
                  icon: <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />,
                },
                {
                  key: 'complexComparison' as const,
                  label: 'Complex property comparison',
                  icon: <Brain className="h-3.5 w-3.5 text-purple-500" />,
                },
                {
                  key: 'maxMessageCount' as const,
                  label: 'Maximum message count exceeded',
                  icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
                },
              ].map((condition) => (
                <div key={condition.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    {condition.icon}
                    <span className="text-sm">{condition.label}</span>
                  </div>
                  <Switch
                    checked={settings.conditions[condition.key]}
                    onCheckedChange={(checked) =>
                      setSettings((current) => ({
                        ...current,
                        conditions: {
                          ...current.conditions,
                          [condition.key]: checked,
                        },
                      }))
                    }
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" />
                Sentiment Triggers
              </CardTitle>
              <CardDescription>Keywords that push the conversation toward handoff or escalation</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  triggers: [
                    ...current.triggers,
                    {
                      id: crypto.randomUUID(),
                      keyword: 'new-keyword',
                      sentiment: 'neutral',
                      action: 'priority',
                      description: 'Custom escalation trigger',
                    },
                  ],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Trigger
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.triggers.map((trigger) => (
            <div key={trigger.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-[1.2fr_0.8fr_0.9fr_1.5fr_auto]">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Keyword</Label>
                <Input
                  value={trigger.keyword}
                  onChange={(event) => updateTrigger(trigger.id, 'keyword', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sentiment</Label>
                <Select
                  value={trigger.sentiment}
                  onValueChange={(value) => updateTrigger(trigger.id, 'sentiment', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Select
                  value={trigger.action}
                  onValueChange={(value) => updateTrigger(trigger.id, 'action', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate_handoff">Immediate Handoff</SelectItem>
                    <SelectItem value="escalate">Escalate</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={trigger.description}
                  onChange={(event) => updateTrigger(trigger.id, 'description', event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      triggers: current.triggers.filter((item) => item.id !== trigger.id),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Escalation Rules
              </CardTitle>
              <CardDescription>Severity levels and response policies for special cases</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  escalationRules: [
                    ...current.escalationRules,
                    {
                      id: crypto.randomUUID(),
                      condition: 'New escalation condition',
                      level: 'medium',
                      action: 'Notify available agent',
                    },
                  ],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.escalationRules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-[1.3fr_0.8fr_1.2fr_auto]">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Condition</Label>
                <Input
                  value={rule.condition}
                  onChange={(event) => updateEscalationRule(rule.id, 'condition', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select
                  value={rule.level}
                  onValueChange={(value) => updateEscalationRule(rule.id, 'level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Input
                  value={rule.action}
                  onChange={(event) => updateEscalationRule(rule.id, 'action', event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      escalationRules: current.escalationRules.filter((item) => item.id !== rule.id),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            SLA Targets
          </CardTitle>
          <CardDescription>Response-time thresholds used to judge handoff performance</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label>AI first response (seconds)</Label>
            <Input
              type="number"
              value={settings.sla.aiFirstResponseSeconds}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    aiFirstResponseSeconds: Number(event.target.value || 0),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Agent accept time (seconds)</Label>
            <Input
              type="number"
              value={settings.sla.agentAcceptSeconds}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    agentAcceptSeconds: Number(event.target.value || 0),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Agent first reply (seconds)</Label>
            <Input
              type="number"
              value={settings.sla.agentFirstReplySeconds}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    agentFirstReplySeconds: Number(event.target.value || 0),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Escalation timeout (seconds)</Label>
            <Input
              type="number"
              value={settings.sla.escalationTimeoutSeconds}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    escalationTimeoutSeconds: Number(event.target.value || 0),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Resolution target (hours)</Label>
            <Input
              type="number"
              value={settings.sla.resolutionTargetHours}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    resolutionTargetHours: Number(event.target.value || 0),
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>After-hours mode</Label>
            <Select
              value={settings.sla.afterHoursMode}
              onValueChange={(value: HandoffSettingsRecord['sla']['afterHoursMode']) =>
                setSettings((current) => ({
                  ...current,
                  sla: {
                    ...current.sla,
                    afterHoursMode: value,
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto-reply">Auto-reply</SelectItem>
                <SelectItem value="queue">Queue for morning</SelectItem>
                <SelectItem value="off">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              Save Handoff Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SettingsHandoffPage() {
  const queryClient = useQueryClient()
  const handoffQuery = useQuery({
    queryKey: ['settings-handoff'],
    queryFn: fetchHandoffSettings,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: saveHandoffSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-handoff'] })
      queryClient.invalidateQueries({ queryKey: ['settings-general'] })
      toast.success('Handoff settings saved', {
        description: 'Escalation rules and SLA targets are now updated.',
      })
    },
    onError: () => {
      toast.error('Could not save handoff settings', {
        description: 'Please review the form values and try again.',
      })
    },
  })

  if (handoffQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (handoffQuery.isError || !handoffQuery.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="font-medium">Handoff settings could not be loaded</p>
          <p className="text-sm text-muted-foreground">
            The API request failed before the form could be populated.
          </p>
          <Button variant="outline" onClick={() => void handoffQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <HandoffSettingsForm
      key={handoffQuery.dataUpdatedAt}
      initialSettings={handoffQuery.data.data}
      isSaving={saveMutation.isPending}
      onSave={(settings) => saveMutation.mutate(settings)}
    />
  )
}
