'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bot, Brain, GitBranch, Thermometer, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface AgentDetail {
  id: string
  name: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  active: boolean
  knowledgeBase: { id: string; name: string } | null
  defaultFlow: { id: string; name: string } | null
}

export function AgentDetailRoute({ agentId }: { agentId: string }) {
  const agentQuery = useQuery<{ data: AgentDetail }>({
    queryKey: ['agent-detail-page', agentId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}`)
      if (!response.ok) {
        throw new Error('Failed to load agent')
      }
      return response.json()
    },
  })

  const agent = agentQuery.data?.data

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
          <Link href="/agents">
            <ArrowLeft className="h-4 w-4" />
            Back to agents
          </Link>
        </Button>
        <h1 className="text-display">Agent Configuration</h1>
        <p className="text-subtitle">System prompt, knowledge base, and flow wiring for this AI agent.</p>
      </div>

      {agentQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : agent ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                {agent.name}
              </CardTitle>
              <CardDescription>Runtime configuration and org-level wiring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant={agent.active ? 'default' : 'secondary'} className="w-fit">
                {agent.active ? 'Active' : 'Inactive'}
              </Badge>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </div>
                  <div className="mt-2 text-lg font-semibold">{agent.temperature}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    Max Tokens
                  </div>
                  <div className="mt-2 text-lg font-semibold">{agent.maxTokens}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4" />
                    Knowledge Base
                  </div>
                  <div className="mt-2 font-medium">{agent.knowledgeBase?.name || 'No knowledge base attached'}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-4 w-4" />
                    Default Flow
                  </div>
                  <div className="mt-2 font-medium">{agent.defaultFlow?.name || 'No default flow attached'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>The base instruction set used for every response.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{agent.systemPrompt}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Agent not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
