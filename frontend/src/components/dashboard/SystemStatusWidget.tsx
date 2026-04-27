'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Database, Gauge, ShieldCheck, Sparkles, Users, Wifi } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SystemStatusResponse {
  data: {
    whatsapp: {
      connected: number
      total: number
      runtime?: {
        trackedDevices: number
        healthyDevices: number
        connectingDevices: number
        unhealthyDevices: number
        replacedConflicts: number
        sendFailures: number
        alerts: string[]
      } | null
    }
    ai: {
      active: number
      total: number
      providers: {
        claude: boolean
        groq: boolean
        openai: boolean
      }
    }
    database: {
      tables: number
      records: number
    }
    team: {
      active: number
      initials: string[]
    }
  }
}

interface StatusCellProps {
  icon: React.ReactNode
  label: string
  value: string
  description: string
  tone?: 'emerald' | 'amber'
  badge?: string
  children?: React.ReactNode
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

function StatusCell({ icon, label, value, description, tone = 'emerald', badge, children }: StatusCellProps) {
  const toneClasses = tone === 'amber'
    ? 'border-amber-200/70 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
    : 'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'

  return (
    <div className={cx('rounded-xl border p-4', toneClasses)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-background/80 p-2 shadow-sm">
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
          </div>
        </div>
        {badge ? (
          <Badge variant="outline" className="text-[10px]">
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

function WidgetSkeleton() {
  return (
    <Card className="card-hover glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-xl" />
      </CardContent>
    </Card>
  )
}

export function SystemStatusWidget() {
  const { data, isLoading } = useQuery<SystemStatusResponse>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const response = await fetch('/api/system/status')
      if (!response.ok) {
        throw new Error('Failed to load system status')
      }
      const payload = (await response.json()) as SystemStatusResponse
      const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()

      return {
        ...payload,
        data: {
          ...payload.data,
          apiLatencyMs: Math.round(finishedAt - startedAt),
        },
      } as SystemStatusResponse & { data: SystemStatusResponse['data'] & { apiLatencyMs: number } }
    },
    refetchInterval: 30_000,
  })

  const status = data?.data

  const aiCoverage = useMemo(() => {
    if (!status) {
      return []
    }

    return [
      { label: 'Claude', enabled: status.ai.providers.claude, note: 'Primary' },
      { label: 'Groq', enabled: status.ai.providers.groq, note: 'Fallback 1' },
      { label: 'OpenAI', enabled: status.ai.providers.openai, note: 'Fallback 2' },
    ]
  }, [status])

  if (isLoading || !status) {
    return <WidgetSkeleton />
  }

  const whatsappConnected = status.whatsapp.total > 0 && status.whatsapp.connected === status.whatsapp.total
  const whatsappRuntime = status.whatsapp.runtime ?? null
  const hasTransportIssue =
    (whatsappRuntime?.unhealthyDevices ?? 0) > 0 ||
    (whatsappRuntime?.replacedConflicts ?? 0) > 0 ||
    (whatsappRuntime?.sendFailures ?? 0) > 0
  const aiReady = status.ai.providers.claude || status.ai.providers.groq || status.ai.providers.openai
  const recordsLabel = status.database.records.toLocaleString()
  const apiLatencyMs = (status as SystemStatusResponse['data'] & { apiLatencyMs?: number }).apiLatencyMs ?? 0

  return (
    <Card className="card-hover glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            System Status
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatusCell
            icon={<Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label="WhatsApp"
            value={hasTransportIssue ? 'Session conflict or send failures' : whatsappConnected ? 'Connected' : 'Needs attention'}
            description={
              hasTransportIssue
                ? whatsappRuntime?.alerts?.[0] ?? 'A WhatsApp device is unhealthy or outbound sends are failing.'
                : `${status.whatsapp.connected} of ${status.whatsapp.total} devices are online.`
            }
            tone={whatsappConnected && !hasTransportIssue ? 'emerald' : 'amber'}
            badge={`${status.whatsapp.connected}/${status.whatsapp.total}`}
          >
            {whatsappRuntime ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  Healthy: {whatsappRuntime.healthyDevices}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Unhealthy: {whatsappRuntime.unhealthyDevices}
                </Badge>
                {whatsappRuntime.replacedConflicts > 0 ? (
                  <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300">
                    Replaced: {whatsappRuntime.replacedConflicts}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </StatusCell>

          <StatusCell
            icon={<Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label="AI Engine"
            value={aiReady ? 'Fallback chain ready' : 'Provider keys missing'}
            description={`${status.ai.active} active AI agent configs across ${status.ai.total} total agents.`}
            tone={aiReady ? 'emerald' : 'amber'}
          >
            <div className="mt-3 flex flex-wrap gap-1.5">
              {aiCoverage.map((provider) => (
                <Badge
                  key={provider.label}
                  variant={provider.enabled ? 'default' : 'outline'}
                  className={cx(
                    'text-[10px]',
                    provider.enabled ? 'bg-emerald-600 text-white hover:bg-emerald-600' : '',
                  )}
                >
                  {provider.label}
                </Badge>
              ))}
            </div>
          </StatusCell>

          <StatusCell
            icon={<Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label="Database"
            value={`${status.database.tables} tables`}
            description={`${recordsLabel} live records across contacts, conversations, messages, properties, and bookings.`}
            badge={recordsLabel}
          />

          <StatusCell
            icon={<Gauge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label="API Response"
            value={`${apiLatencyMs}ms`}
            description="Measured from the latest dashboard status fetch."
            tone={apiLatencyMs > 600 ? 'amber' : 'emerald'}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Team Coverage</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {status.team.active} active members
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {status.team.initials.length > 0 ? (
              status.team.initials.map((initials, index) => (
                <Avatar key={`${initials}-${index}`} className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No active team members found.</p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Status reflects live org-scoped records instead of synthetic dashboard data.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
