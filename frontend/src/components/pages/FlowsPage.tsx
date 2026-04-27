'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GitBranch,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Bot,
  CalendarDays,
  Zap,
  HelpCircle,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Play,
  Pause,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Types ────────────────────────────────────────────────────────────────────

interface FlowStep {
  id: string
  flowId: string
  order: number
  type: string
  config: string // JSON string from API
  nextStepId: string | null
  createdAt: string
}

interface Flow {
  id: string
  orgId: string
  name: string
  description: string | null
  triggerType: string
  active: boolean
  createdAt: string
  stepCount: number
  agentCount: number
}

interface FlowDetail extends Flow {
  steps: FlowStep[]
}

interface Agent {
  id: string
  name: string
  defaultFlowId: string | null
  defaultFlow?: { id: string; name: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTriggerBadge(type: string): { color: string; label: string } {
  switch (type) {
    case 'message': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', label: 'Message' }
    case 'keyword': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', label: 'Keyword' }
    case 'greeting': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Greeting' }
    case 'property_enquiry': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', label: 'Property Enquiry' }
    default: return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: type }
  }
}

function getStepIcon(type: string) {
  switch (type) {
    case 'send_message': return <MessageSquare className="h-4 w-4 text-blue-500" />
    case 'ask_question': return <HelpCircle className="h-4 w-4 text-amber-500" />
    case 'ai_response': return <Bot className="h-4 w-4 text-emerald-500" />
    case 'condition': return <GitBranch className="h-4 w-4 text-purple-500" />
    case 'action': return <Zap className="h-4 w-4 text-orange-500" />
    default: return <Layers className="h-4 w-4 text-gray-400" />
  }
}

function getStepLabel(type: string): string {
  switch (type) {
    case 'send_message': return 'Send Message'
    case 'ask_question': return 'Ask Question'
    case 'ai_response': return 'AI Response'
    case 'condition': return 'Condition'
    case 'action': return 'Action'
    default: return type
  }
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function FlowCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function FlowsPage() {
  // ── State ─────────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Flow | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────
  const flowsQuery = useQuery<{ data?: Flow[] }>({
    queryKey: ['flows'],
    queryFn: () => fetch('/api/flows').then((r) => r.json()),
  })

  const agentsQuery = useQuery<{ data?: Agent[] }>({
    queryKey: ['agents'],
    queryFn: () => fetch('/api/agents').then((r) => r.json()),
  })

  const flowDetailQuery = useQuery<FlowDetail>({
    queryKey: ['flow-detail', selectedFlowId],
    queryFn: () => fetch(`/api/flows/${selectedFlowId}`).then((r) => r.json()).then((res) => res.data),
    enabled: !!selectedFlowId && sheetOpen,
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleViewFlow = useCallback((flow: Flow) => {
    setSelectedFlowId(flow.id)
    setSheetOpen(true)
  }, [])

  const getAgentsForFlow = useCallback((flowId: string): string[] => {
    const agents = agentsQuery.data?.data ?? []
    return agents.filter((a) => a.defaultFlowId === flowId).map((a) => a.name)
  }, [agentsQuery.data])

  // ── Render ────────────────────────────────────────────────────────────
  const flows = (flowsQuery.data as { data?: Flow[] })?.data ?? []
  const flowDetail = flowDetailQuery.data

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-emerald-600" />
            Conversation Flows
          </h1>
          <p className="text-subtitle">Automated chatbot flows</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white press-scale">
          <Plus className="h-4 w-4 mr-2" />
          Create Flow
        </Button>
      </div>

      {/* Flow Cards */}
      {flowsQuery.isLoading || flowsQuery.data === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <FlowCardSkeleton key={i} />)}
        </div>
      ) : flows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon rounded-full bg-muted p-4 mb-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No flows yet</h3>
          <p className="empty-state-text text-sm text-muted-foreground max-w-[260px] mb-4">
            Create your first conversation flow to automate chatbot responses.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Flow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flows.map((flow) => {
            const triggerBadge = getTriggerBadge(flow.triggerType)
            const agentNames = getAgentsForFlow(flow.id)

            return (
              <Card key={flow.id} className="group card-hover">
                <CardContent className="p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2.5 shrink-0">
                      <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{flow.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {flow.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`tag-pill inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${triggerBadge.color}`}>
                      {triggerBadge.label}
                    </span>
                    <Badge variant="outline" className="text-[11px] gap-1">
                      <Layers className="h-3 w-3" />
                      {flow.stepCount} steps
                    </Badge>
                    <Badge variant={flow.active ? 'default' : 'secondary'} className={`text-[11px] gap-1 ${flow.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}>
                      {flow.active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {flow.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Agents */}
                  {agentNames.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Agents:</span>
                      {agentNames.map((name) => (
                        <Badge key={name} variant="secondary" className="text-[10px] h-5">{name}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Created */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Created {new Date(flow.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={flow.active} className="data-[state=checked]:bg-emerald-600" />
                      <span className="text-xs text-muted-foreground">
                        {flow.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFlow(flow)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteDialog(flow)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Flow Detail Sheet                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedFlowId(null) }}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Flow Detail</SheetTitle>
            <SheetDescription>View and manage conversation flow</SheetDescription>
          </SheetHeader>

          {flowDetailQuery.isLoading ? (
            <div className="space-y-4 px-4 pt-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-3 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ) : flowDetail ? (
            <div className="space-y-6 px-4 pt-2 pb-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                    <GitBranch className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getTriggerBadge(flowDetail.triggerType).color}`}>
                    {getTriggerBadge(flowDetail.triggerType).label}
                  </span>
                  <Badge variant={flowDetail.active ? 'default' : 'secondary'} className={`text-[11px] ${flowDetail.active ? 'bg-emerald-100 text-emerald-700' : ''}`}>
                    {flowDetail.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold">{flowDetail.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{flowDetail.description || 'No description'}</p>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                  <Input defaultValue={flowDetail.name} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                  <Input defaultValue={flowDetail.description || ''} className="text-sm" />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger</h4>
                <Select defaultValue={flowDetail.triggerType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Message Received</SelectItem>
                    <SelectItem value="keyword">Keyword Match</SelectItem>
                    <SelectItem value="greeting">Greeting</SelectItem>
                    <SelectItem value="property_enquiry">Property Enquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Steps ({(flowDetail.steps ?? []).length})
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Step
                  </Button>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {(flowDetail.steps ?? []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GitBranch className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No steps in this flow</p>
                      </div>
                    ) : (
                      (flowDetail.steps ?? [])
                        .sort((a, b) => a.order - b.order)
                        .map((step, idx) => {
                          let parsedConfig: Record<string, string> = {}
                          try { parsedConfig = JSON.parse(step.config || '{}') } catch { /* ignore */ }
                          return (
                          <div key={step.id} className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                            <div className="flex items-start gap-3">
                              {/* Step Number */}
                              <div className="flex flex-col items-center shrink-0">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </div>
                                {idx < (flowDetail.steps ?? []).length - 1 && (
                                  <div className="w-px h-6 bg-border mt-1" />
                                )}
                              </div>

                              {/* Step Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStepIcon(step.type)}
                                  <span className="text-xs font-semibold">{getStepLabel(step.type)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  {Object.entries(parsedConfig).map(([key, value]) => (
                                    <p key={key} className="line-clamp-1">
                                      <span className="font-medium">{key}:</span>{' '}
                                      {typeof value === 'string' ? value : JSON.stringify(value)}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          )
                        })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? This will remove all {deleteDialog?.stepCount} steps.
              Agents using this flow will revert to default behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
