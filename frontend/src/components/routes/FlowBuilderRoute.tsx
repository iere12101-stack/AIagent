'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bot, GitBranch, Layers } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface FlowStep {
  id: string
  stepOrder?: number
  stepType?: string
  config?: Record<string, unknown>
}

interface FlowDetail {
  id: string
  name: string
  description: string | null
  triggerType: string
  active: boolean
  agentCount: number
  flowSteps?: FlowStep[]
}

export function FlowBuilderRoute({ flowId }: { flowId: string }) {
  const flowQuery = useQuery<{ data: FlowDetail }>({
    queryKey: ['flow-builder-page', flowId],
    queryFn: async () => {
      const response = await fetch(`/api/flows/${flowId}`)
      if (!response.ok) {
        throw new Error('Failed to load flow')
      }
      return response.json()
    },
  })

  const flow = flowQuery.data?.data

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
          <Link href="/flows">
            <ArrowLeft className="h-4 w-4" />
            Back to flows
          </Link>
        </Button>
        <h1 className="text-display">Flow Builder</h1>
        <p className="text-subtitle">Step-by-step builder view for the selected conversation flow.</p>
      </div>

      {flowQuery.isLoading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : flow ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-emerald-600" />
                {flow.name}
              </CardTitle>
              <CardDescription>{flow.description || 'No description provided'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{flow.triggerType}</Badge>
                <Badge variant="outline">{flow.flowSteps?.length ?? 0} steps</Badge>
                <Badge variant="outline">{flow.agentCount} agents</Badge>
                <Badge variant={flow.active ? 'default' : 'secondary'}>{flow.active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
                This builder route mirrors the selected flow detail into a dedicated URL so flows can be opened directly from the app router and shared inside the dashboard.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                Step Stack
              </CardTitle>
              <CardDescription>Ordered execution path for this conversation flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {flow.flowSteps && flow.flowSteps.length > 0 ? (
                flow.flowSteps.map((step, index) => (
                  <div key={step.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{step.stepType || 'Step'}</div>
                          <div className="text-xs text-muted-foreground">Order {step.stepOrder ?? index + 1}</div>
                        </div>
                      </div>
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {step.config ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs leading-5">{JSON.stringify(step.config, null, 2)}</pre>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No flow steps are attached to this flow yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Flow not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
