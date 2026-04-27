'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Crown,
  MapPin,
  RotateCw,
  Save,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { type TeamSettingsRecord } from '@/lib/organization-settings'
import { useAppStore } from '@/lib/store'

interface TeamMember {
  id: string
  name: string
  role: string
  active: boolean
  phone?: string | null
  specialityAreas?: string
  areaSpeciality?: string[]
}

interface TeamSettingsResponse {
  data: TeamSettingsRecord
  teamMembers: Array<{
    id: string
    name: string
    role: string
    active: boolean
  }>
}

interface TeamDirectoryResponse {
  data: TeamMember[]
}

async function fetchTeamSettings(): Promise<TeamSettingsResponse> {
  const response = await fetch('/api/settings/team')
  if (!response.ok) {
    throw new Error('Failed to load team settings')
  }

  return response.json()
}

async function fetchTeamDirectory(): Promise<TeamDirectoryResponse> {
  const response = await fetch('/api/team')
  if (!response.ok) {
    throw new Error('Failed to load team members')
  }

  return response.json()
}

async function saveTeamSettings(settings: TeamSettingsRecord): Promise<void> {
  const response = await fetch('/api/settings/team', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error('Failed to save team settings')
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getRoleIcon(role: string) {
  if (role === 'CEO') return <Crown className="h-3.5 w-3.5 text-purple-500" />
  return <UserCog className="h-3.5 w-3.5 text-emerald-500" />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  )
}

function TeamSettingsForm({
  initialSettings,
  teamMembers,
  teamDirectory,
  isSaving,
  onSave,
}: {
  initialSettings: TeamSettingsRecord
  teamMembers: TeamSettingsResponse['teamMembers']
  teamDirectory: TeamMember[]
  isSaving: boolean
  onSave: (settings: TeamSettingsRecord) => void
}) {
  const { setCurrentPage } = useAppStore()
  const [settings, setSettings] = useState<TeamSettingsRecord>({ ...initialSettings })

  const activeTeamMembers = teamMembers.filter((member) => member.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage('settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Team Settings
          </h1>
          <p className="text-muted-foreground">Manage assignment defaults and review active team coverage</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Default Handoff Agent
          </CardTitle>
          <CardDescription>Choose who receives handoffs when no route-specific match is found</CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-1.5">
          <Label>Default Agent</Label>
          <Select
            value={settings.defaultHandoffAgentId ?? 'none'}
            onValueChange={(value) =>
              setSettings((current) => ({
                ...current,
                defaultHandoffAgentId: value === 'none' ? null : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default agent</SelectItem>
              {activeTeamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCw className="h-4 w-4" />
            Assignment Rules
          </CardTitle>
          <CardDescription>Persisted org-level routing strategy for new conversations and handoffs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Auto-assignment</p>
              <p className="text-xs text-muted-foreground">Assign new conversations without waiting for manual routing</p>
            </div>
            <Switch
              checked={settings.autoAssignEnabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, autoAssignEnabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Round robin distribution</p>
              <p className="text-xs text-muted-foreground">Evenly rotate new leads across available agents</p>
            </div>
            <Switch
              checked={settings.roundRobinEnabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, roundRobinEnabled: checked }))
              }
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assignment priority</Label>
            <Select
              value={settings.assignmentPriority}
              onValueChange={(value: TeamSettingsRecord['assignmentPriority']) =>
                setSettings((current) => ({ ...current, assignmentPriority: value }))
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area-expert">Area expert routing</SelectItem>
                <SelectItem value="round-robin">Round robin</SelectItem>
                <SelectItem value="least-busy">Least busy agent</SelectItem>
                <SelectItem value="lead-score">Lead score priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-4 w-4" />
            Active Team Coverage
          </CardTitle>
          <CardDescription>Live view of the current org team roster and their primary specialities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teamDirectory.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {getRoleIcon(member.role)}
                  <Badge
                    variant="outline"
                    className={
                      member.active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }
                  >
                    {member.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <div className="hidden flex-wrap gap-1 lg:flex lg:max-w-[360px] lg:justify-end">
                {(member.areaSpeciality ?? []).slice(0, 3).map((area) => (
                  <Badge key={area} variant="secondary" className="text-[10px]">
                    <MapPin className="mr-1 h-2.5 w-2.5" />
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          ))}

          {teamDirectory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No team members are available for this organization yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-end">
        <Button
          onClick={() => onSave(settings)}
          disabled={isSaving}
          className="min-w-[170px] gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Team Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SettingsTeamPage() {
  const queryClient = useQueryClient()
  const teamSettingsQuery = useQuery({
    queryKey: ['settings-team'],
    queryFn: fetchTeamSettings,
    staleTime: 30_000,
  })
  const teamDirectoryQuery = useQuery({
    queryKey: ['team'],
    queryFn: fetchTeamDirectory,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: saveTeamSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-team'] })
      toast.success('Team settings saved', {
        description: 'Assignment defaults were updated for this organization.',
      })
    },
    onError: () => {
      toast.error('Could not save team settings', {
        description: 'Please try again after checking the selected agent and routing rules.',
      })
    },
  })

  if (teamSettingsQuery.isLoading || teamDirectoryQuery.isLoading) {
    return <LoadingSkeleton />
  }

  if (teamSettingsQuery.isError || !teamSettingsQuery.data || teamDirectoryQuery.isError || !teamDirectoryQuery.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="font-medium">Team settings could not be loaded</p>
          <p className="text-sm text-muted-foreground">
            One of the org-scoped team requests failed before the page could render.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void teamSettingsQuery.refetch()
              void teamDirectoryQuery.refetch()
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <TeamSettingsForm
      key={`${teamSettingsQuery.dataUpdatedAt}-${teamDirectoryQuery.dataUpdatedAt}`}
      initialSettings={teamSettingsQuery.data.data}
      teamMembers={teamSettingsQuery.data.teamMembers}
      teamDirectory={teamDirectoryQuery.data.data}
      isSaving={saveMutation.isPending}
      onSave={(settings) => saveMutation.mutate(settings)}
    />
  )
}
