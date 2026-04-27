'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserCog,
  Plus,
  Phone,
  MapPin,
  Eye,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Building2,
  Crown,
  Briefcase,
  HeadphonesIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
  }
  if (digits.length === 10) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }
  return phone
}

function formatAED(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

function getRoleColor(role: string): string {
  const lower = role.toLowerCase()
  if (lower.includes('ceo') || lower.includes('director')) return 'ring-purple-400'
  if (lower.includes('manager') || lower.includes('head')) return 'ring-blue-400'
  if (lower.includes('agent') || lower.includes('broker')) return 'ring-emerald-400'
  if (lower.includes('reception')) return 'ring-gray-400'
  return 'ring-gray-300'
}

function getRoleBgColor(role: string): string {
  const lower = role.toLowerCase()
  if (lower.includes('ceo') || lower.includes('director')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
  if (lower.includes('manager') || lower.includes('head')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  if (lower.includes('agent') || lower.includes('broker')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (lower.includes('reception')) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

function getRoleIcon(role: string) {
  const lower = role.toLowerCase()
  if (lower.includes('ceo') || lower.includes('director')) return <Crown className="h-4 w-4" />
  if (lower.includes('manager') || lower.includes('head')) return <Briefcase className="h-4 w-4" />
  if (lower.includes('reception')) return <HeadphonesIcon className="h-4 w-4" />
  return <UserCog className="h-4 w-4" />
}

function getRouteToColor(routeTo: string): string {
  switch (routeTo?.toUpperCase()) {
    case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
    case 'HOT': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    case 'WARM': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
    case 'SUPPORT': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
}

function getRouteToDot(routeTo: string): string {
  switch (routeTo?.toUpperCase()) {
    case 'VIP': return 'bg-purple-500'
    case 'HOT': return 'bg-red-500'
    case 'WARM': return 'bg-amber-500'
    case 'SUPPORT': return 'bg-blue-500'
    default: return 'bg-gray-400'
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  role: string
  whatsapp: string
  specialityAreas: string
  routeTo: string
  minBudgetAed: number | null
  active: boolean
  notes: string | null
}

interface AddTeamMemberInput {
  name: string
  role: 'CEO' | 'Sales Manager' | 'Agent' | 'Receptionist'
  whatsapp: string
  email: string
  areas: string
  budgetThresholdAed: string
  notes: string
}

const INITIAL_ADD_MEMBER_FORM: AddTeamMemberInput = {
  name: '',
  role: 'Agent',
  whatsapp: '',
  email: '',
  areas: '',
  budgetThresholdAed: '',
  notes: '',
}

const ROLE_OPTIONS: Array<AddTeamMemberInput['role']> = ['CEO', 'Sales Manager', 'Agent', 'Receptionist']

// ── Skeletons ────────────────────────────────────────────────────────────────

function TeamGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AgentsPage() {
  const queryClient = useQueryClient()
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<TeamMember | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addMemberForm, setAddMemberForm] = useState<AddTeamMemberInput>(INITIAL_ADD_MEMBER_FORM)

  // ── Queries ───────────────────────────────────────────────────────────
  const teamQuery = useQuery<{ data: TeamMember[] }>({
    queryKey: ['team'],
    queryFn: () => fetch('/api/team').then((r) => r.json()),
    staleTime: 30000,
  })

  const propertiesQuery = useQuery<{ data: { total: number } }>({
    queryKey: ['agent-properties', selectedAgent?.name],
    queryFn: () => fetch(`/api/properties?agentName=${encodeURIComponent(selectedAgent!.name)}&limit=1`).then((r) => r.json()),
    enabled: !!selectedAgent && detailSheetOpen,
  })

  const addTeamMemberMutation = useMutation({
    mutationFn: async (payload: AddTeamMemberInput) => {
      const areaSpeciality = payload.areas
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      const budgetValue = payload.budgetThresholdAed.trim().length > 0
        ? Number(payload.budgetThresholdAed.trim())
        : null

      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          role: payload.role,
          whatsapp: payload.whatsapp,
          email: payload.email,
          areaSpeciality,
          budgetThresholdAed: Number.isFinite(budgetValue) ? budgetValue : null,
          notes: payload.notes.trim() || null,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to add team member')
      }
    },
    onSuccess: () => {
      setAddDialogOpen(false)
      setAddMemberForm(INITIAL_ADD_MEMBER_FORM)
      queryClient.invalidateQueries({ queryKey: ['team'] })
      toast.success('Team member added')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add team member'
      toast.error(message)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedAgent((prev) => (prev === id ? null : id))
  }, [])

  const handleViewDetail = useCallback((agent: TeamMember) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(true)
  }, [])

  const handleAddMember = useCallback(() => {
    if (!addMemberForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!addMemberForm.whatsapp.trim()) {
      toast.error('WhatsApp number is required')
      return
    }
    if (!addMemberForm.email.trim()) {
      toast.error('Email is required')
      return
    }

    addTeamMemberMutation.mutate({
      ...addMemberForm,
      name: addMemberForm.name.trim(),
      whatsapp: addMemberForm.whatsapp.trim(),
      email: addMemberForm.email.trim(),
    })
  }, [addMemberForm, addTeamMemberMutation])

  const teamMembers = teamQuery.data?.data ?? []

  // ── Area specialist map ───────────────────────────────────────────────
  const routeTypes = ['VIP', 'HOT', 'WARM', 'SUPPORT'] as const
  const activeMembers = teamMembers.filter((m) => m.active)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display">Team Members</h1>
          <p className="text-subtitle">
            {teamQuery.isLoading ? 'Loading...' : `${teamMembers.length} agents`}
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white press-scale"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Area Specialist Routing Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Area Specialist Routing Matrix
          </CardTitle>
          <CardDescription>
            Visual overview of lead routing rules and team member specializations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-3">
              {routeTypes.map((type) => {
                const membersForType = activeMembers.filter(
                  (m) => m.routeTo?.toUpperCase() === type
                )
                return (
                  <div key={type} className="flex items-center gap-3">
                    <Badge variant="outline" className={`w-24 justify-center text-xs font-bold ${getRouteToColor(type)}`}>
                      <span className={`h-2 w-2 rounded-full ${getRouteToDot(type)} mr-1.5`} />
                      {type}
                    </Badge>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {membersForType.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No specialist assigned</span>
                      ) : (
                        membersForType.map((m) => {
                          let areas: string[] = []
                          try {
                            areas = JSON.parse(m.specialityAreas)
                          } catch {
                            areas = m.specialityAreas ? m.specialityAreas.split(',').map((s) => s.trim()) : []
                          }
                          return (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted transition-colors"
                              onClick={() => handleViewDetail(m)}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className={`text-[10px] font-semibold bg-background ${getRoleColor(m.role)} ring-1`}>
                                  {getInitials(m.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate max-w-[120px]">{m.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  {areas.slice(0, 3).join(', ')}{areas.length > 3 ? '...' : ''}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Grid */}
      {teamQuery.isLoading ? (
        <TeamGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teamMembers.map((member) => {
            const isExpanded = expandedAgent === member.id
            let areas: string[] = []
            try {
              areas = JSON.parse(member.specialityAreas)
            } catch {
              areas = member.specialityAreas ? member.specialityAreas.split(',').map((s) => s.trim()) : []
            }

            return (
              <Card key={member.id} className={`transition-all duration-200 card-hover ${!member.active ? 'opacity-60' : ''}`}>
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`h-12 w-12 ${getRoleColor(member.role)} ring-2`}>
                        <AvatarFallback className={`${getRoleBgColor(member.role)} text-sm font-bold`}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-base">{member.name}</h3>
                        <Badge variant="outline" className={`text-xs gap-1 mt-1 ${getRoleBgColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewDetail(member)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleExpand(member.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 hover:underline mb-3"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(member.whatsapp)}
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  {/* Speciality Areas */}
                  {areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {areas.map((area, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Route To & Min Budget */}
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={`text-xs ${getRouteToColor(member.routeTo)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getRouteToDot(member.routeTo)} mr-1`} />
                      {member.routeTo || 'N/A'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Min: {formatAED(member.minBudgetAed)}
                    </span>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${member.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-muted-foreground">
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {member.notes && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm text-foreground">{member.notes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-xs text-muted-foreground">Route</p>
                          <Badge variant="outline" className={`text-xs mt-1 ${getRouteToColor(member.routeTo)}`}>
                            {member.routeTo || 'N/A'}
                          </Badge>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-xs text-muted-foreground">Min Budget</p>
                          <p className="text-sm font-bold mt-1">{formatAED(member.minBudgetAed)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleViewDetail(member)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Full Details
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Agent Detail Sheet                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open && !addTeamMemberMutation.isPending) {
            setAddMemberForm(INITIAL_ADD_MEMBER_FORM)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add CEO, Sales Manager, or Agent details for lead routing and handoff.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Full Name</Label>
              <Input
                id="team-name"
                placeholder="Muhammad Imran Khan"
                value={addMemberForm.name}
                onChange={(event) =>
                  setAddMemberForm((previous) => ({ ...previous, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="team-role">Role</Label>
                <Select
                  value={addMemberForm.role}
                  onValueChange={(value) =>
                    setAddMemberForm((previous) => ({
                      ...previous,
                      role: value as AddTeamMemberInput['role'],
                    }))
                  }
                >
                  <SelectTrigger id="team-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="team-budget">Budget Threshold (AED)</Label>
                <Input
                  id="team-budget"
                  type="number"
                  min="0"
                  placeholder="2000000"
                  value={addMemberForm.budgetThresholdAed}
                  onChange={(event) =>
                    setAddMemberForm((previous) => ({
                      ...previous,
                      budgetThresholdAed: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="team-whatsapp">WhatsApp</Label>
                <Input
                  id="team-whatsapp"
                  placeholder="+971521234567"
                  value={addMemberForm.whatsapp}
                  onChange={(event) =>
                    setAddMemberForm((previous) => ({ ...previous, whatsapp: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="team-email">Email</Label>
                <Input
                  id="team-email"
                  type="email"
                  placeholder="name@iere.ae"
                  value={addMemberForm.email}
                  onChange={(event) =>
                    setAddMemberForm((previous) => ({ ...previous, email: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team-areas">Area Speciality</Label>
              <Input
                id="team-areas"
                placeholder="Dubai Marina, Business Bay, Downtown Dubai"
                value={addMemberForm.areas}
                onChange={(event) =>
                  setAddMemberForm((previous) => ({ ...previous, areas: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">Use commas to separate multiple areas.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team-notes">Notes (Optional)</Label>
              <Textarea
                id="team-notes"
                rows={3}
                placeholder="Any routing, language, or handoff instructions."
                value={addMemberForm.notes}
                onChange={(event) =>
                  setAddMemberForm((previous) => ({ ...previous, notes: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (addTeamMemberMutation.isPending) return
                setAddDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAddMember}
              disabled={addTeamMemberMutation.isPending}
            >
              {addTeamMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={detailSheetOpen} onOpenChange={(open) => { setDetailSheetOpen(open); if (!open) setSelectedAgent(null) }}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Agent Details</SheetTitle>
            <SheetDescription>View team member details and property assignments</SheetDescription>
          </SheetHeader>

          {selectedAgent ? (
            <div className="space-y-6 px-4 pt-2 pb-6">
              {/* Agent Header */}
              <div className="flex items-start gap-4">
                <Avatar className={`h-16 w-16 shrink-0 ${getRoleColor(selectedAgent.role)} ring-2`}>
                  <AvatarFallback className={`${getRoleBgColor(selectedAgent.role)} text-lg font-bold`}>
                    {getInitials(selectedAgent.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold">{selectedAgent.name}</h2>
                  <Badge variant="outline" className={`text-xs gap-1 mt-1 ${getRoleBgColor(selectedAgent.role)}`}>
                    {getRoleIcon(selectedAgent.role)}
                    {selectedAgent.role}
                  </Badge>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`h-2 w-2 rounded-full ${selectedAgent.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-muted-foreground">
                      {selectedAgent.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${selectedAgent.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <Phone className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">{formatPhone(selectedAgent.whatsapp)}</p>
                  <p className="text-xs opacity-70">Click to open WhatsApp</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto" />
              </a>

              <Separator />

              {/* Route & Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Route To</p>
                  <Badge variant="outline" className={`text-xs ${getRouteToColor(selectedAgent.routeTo)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getRouteToDot(selectedAgent.routeTo)} mr-1`} />
                    {selectedAgent.routeTo || 'N/A'}
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Min Budget</p>
                  <p className="text-lg font-bold">{formatAED(selectedAgent.minBudgetAed)}</p>
                </div>
              </div>

              <Separator />

              {/* Speciality Areas */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Speciality Areas
                </h4>
                {(() => {
                  let areas: string[] = []
                  try {
                    areas = JSON.parse(selectedAgent.specialityAreas)
                  } catch {
                    areas = selectedAgent.specialityAreas ? selectedAgent.specialityAreas.split(',').map((s) => s.trim()) : []
                  }
                  return areas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {areas.map((area, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {area}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No speciality areas defined</p>
                  )
                })()}
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Properties</span>
                  </div>
                  {propertiesQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-lg font-bold">{propertiesQuery.data?.data?.total ?? 0}</p>
                  )}
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Conversations</span>
                  </div>
                  <p className="text-lg font-bold">—</p>
                </div>
              </div>

              {/* Notes */}
              {selectedAgent.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedAgent.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  asChild
                >
                  <a
                    href={`https://wa.me/${selectedAgent.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4" />
                    Message
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No agent selected</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
