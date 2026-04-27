'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Calendar,
  Clock,
  Crown,
  Handshake,
  Inbox,
  MessageSquare,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter'
import { useAppStore } from '@/lib/store'

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
]

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#f97316']

interface PerformanceMember {
  member: {
    id: string
    name: string
    role: string
    whatsapp: string
    email: string
    phone: string
    specialityAreas: string
    areaSpeciality: string[]
    active: boolean
    createdAt: string
    updatedAt: string
  }
  conversations: number
  averageResponseTimeSeconds: number
  conversions: number
  conversionRate: number
  averageLeadScore: number
  activeContacts: number
  handoffs: number
  lastActivityAt: string
  dailyConversations: Array<{ date: string; count: number }>
}

interface TeamPerformanceResponse {
  data: {
    summary: {
      totalMembers: number
      activeAgents: number
      totalConversations: number
      totalConversions: number
      averageResponseTimeSeconds: number
      averageConversionRate: number
    }
    members: PerformanceMember[]
    weekdayActivity: Array<{ day: string; conversations: number }>
  }
}

interface TooltipPayloadEntry {
  value: number
  name: string
  color: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatSeconds(seconds: number): string {
  if (seconds <= 0) {
    return 'No replies yet'
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function formatRelative(dateString: string): string {
  const timestamp = new Date(dateString).getTime()
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function parseSpecialities(value: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : fallback
  } catch {
    return fallback
  }
}

function RoleBadge({ role }: { role: string }) {
  const lower = role.toLowerCase()
  const classes = lower === 'ceo'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
    : lower === 'sales manager'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'

  return (
    <Badge variant="outline" className={`text-[10px] ${classes}`}>
      {role}
    </Badge>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="chart-tooltip">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-52" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function AgentDetailSheet({
  agent,
  open,
  onClose,
}: {
  agent: PerformanceMember | null
  open: boolean
  onClose: () => void
}) {
  if (!agent) {
    return null
  }

  const specialities = parseSpecialities(agent.member.specialityAreas, agent.member.areaSpeciality)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Agent Detail</SheetTitle>
          <SheetDescription>Live performance details from current org activity.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarFallback className={`text-lg font-bold text-white ${getAvatarColor(agent.member.id)}`}>
                {getInitials(agent.member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <h3 className="text-lg font-semibold">{agent.member.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={agent.member.role} />
                  <Badge variant={agent.member.active ? 'default' : 'secondary'} className={agent.member.active ? 'bg-emerald-600 text-white' : ''}>
                    {agent.member.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{agent.member.email}</p>
                <p>{agent.member.phone}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Conversations', value: agent.conversations.toLocaleString(), icon: <MessageSquare className="h-4 w-4 text-emerald-600" /> },
              { label: 'Avg Response', value: formatSeconds(agent.averageResponseTimeSeconds), icon: <Clock className="h-4 w-4 text-amber-600" /> },
              { label: 'Conversions', value: agent.conversions.toLocaleString(), icon: <TrendingUp className="h-4 w-4 text-blue-600" /> },
              { label: 'Lead Score', value: `${agent.averageLeadScore}/100`, icon: <Target className="h-4 w-4 text-violet-600" /> },
              { label: 'Active Contacts', value: agent.activeContacts.toLocaleString(), icon: <Users className="h-4 w-4 text-cyan-600" /> },
              { label: 'Handoffs', value: agent.handoffs.toLocaleString(), icon: <Handshake className="h-4 w-4 text-pink-600" /> },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {metric.icon}
                  {metric.label}
                </div>
                <div className="text-lg font-bold">{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Activity
            </div>
            <p className="text-sm text-muted-foreground">
              Last activity {formatRelative(agent.lastActivityAt)}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Conversion rate {(agent.conversionRate * 100).toFixed(1)}% across assigned conversations.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-emerald-600" />
              Speciality Areas
            </div>
            {specialities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specialities.map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No speciality areas configured yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => { useAppStore.getState().setCurrentPage('inbox'); onClose() }}>
              <Inbox className="mr-2 h-4 w-4" />
              Open Inbox
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function TeamPerformancePage() {
  const [selectedAgent, setSelectedAgent] = useState<PerformanceMember | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, isLoading } = useQuery<TeamPerformanceResponse>({
    queryKey: ['team-performance'],
    queryFn: async () => {
      const response = await fetch('/api/team/performance')
      if (!response.ok) {
        throw new Error('Failed to fetch team performance')
      }
      return (await response.json()) as TeamPerformanceResponse
    },
  })

  const members = data?.data.members ?? []
  const summary = data?.data.summary
  const weekdayActivity = data?.data.weekdayActivity ?? []

  const conversationsChart = useMemo(
    () =>
      members.map((member) => ({
        name: member.member.name.split(' ')[0],
        fullName: member.member.name,
        conversations: member.conversations,
      })),
    [members],
  )

  const responseChart = useMemo(
    () =>
      members.map((member) => ({
        name: member.member.name.split(' ')[0],
        fullName: member.member.name,
        response: member.averageResponseTimeSeconds,
      })),
    [members],
  )

  const leadScoreChart = useMemo(
    () =>
      members.map((member) => ({
        name: member.member.name.split(' ')[0],
        fullName: member.member.name,
        leadScore: member.averageLeadScore,
      })),
    [members],
  )

  const openAgent = (agent: PerformanceMember) => {
    setSelectedAgent(agent)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BarChart3 className="h-6 w-6 text-emerald-600" />
          Team Performance
        </h1>
        <p className="text-muted-foreground">Live leaderboard and workload metrics for your org team.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <SummaryCardSkeleton key={index} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Active Agents</CardTitle>
                <Users className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={summary?.activeAgents ?? 0} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary?.totalMembers ?? 0} total team members configured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatSeconds(summary?.averageResponseTimeSeconds ?? 0)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Average across assigned conversations with reply pairs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={(summary?.averageConversionRate ?? 0) * 100} format="percent" decimals={1} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on confirmed or completed bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Assigned Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  <AnimatedCounter value={summary?.totalConversations ?? 0} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary?.totalConversions ?? 0} conversions captured from this workload
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Live Leaderboard
            </CardTitle>
            <CardDescription>Sorted by conversion rate, then total assigned conversations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Conversations</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Lead Score</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((agent) => (
                    <TableRow
                      key={agent.member.id}
                      className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                      onClick={() => openAgent(agent)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-xs font-semibold text-white ${getAvatarColor(agent.member.id)}`}>
                              {getInitials(agent.member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{agent.member.name}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <RoleBadge role={agent.member.role} />
                              <span className="text-xs text-muted-foreground">
                                {(agent.conversionRate * 100).toFixed(1)}% conversion
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{agent.conversations}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatSeconds(agent.averageResponseTimeSeconds)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{agent.conversions}</TableCell>
                      <TableCell className="text-right">{agent.averageLeadScore}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={agent.member.active ? 'default' : 'secondary'} className={agent.member.active ? 'bg-emerald-600 text-white' : ''}>
                          {agent.member.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {members.map((agent) => (
                <button
                  key={agent.member.id}
                  onClick={() => openAgent(agent)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`text-xs font-semibold text-white ${getAvatarColor(agent.member.id)}`}>
                      {getInitials(agent.member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{agent.member.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <RoleBadge role={agent.member.role} />
                      <span className="text-xs text-muted-foreground">{formatSeconds(agent.averageResponseTimeSeconds)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-600">{agent.conversations}</div>
                    <div className="text-[10px] text-muted-foreground">assigned</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Conversations Per Agent</CardTitle>
              <CardDescription>Current workload distribution across assigned conversations.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversationsChart}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="conversations" name="Conversations" radius={[6, 6, 0, 0]}>
                    {conversationsChart.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time</CardTitle>
              <CardDescription>Measured from inbound-to-outbound pairs on assigned threads.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseChart}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="response" name="Seconds" radius={[6, 6, 0, 0]}>
                    {responseChart.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Average Lead Score</CardTitle>
              <CardDescription>Average lead quality for each member's active portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadScoreChart}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="leadScore" name="Lead Score" radius={[6, 6, 0, 0]}>
                    {leadScoreChart.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Workload Pattern</CardTitle>
              <CardDescription>Assigned conversation activity grouped by weekday.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weekdayActivity}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="conversations" name="Conversations" radius={[6, 6, 0, 0]}>
                    {weekdayActivity.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <AgentDetailSheet
        agent={selectedAgent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
