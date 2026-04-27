'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpenText, DatabaseZap, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface KnowledgeChunk {
  id: string
  content: string
}

interface KnowledgeBaseDetail {
  id: string
  name: string
  description: string | null
  sourceType: string
  agentCount: number
  knowledgeChunks?: KnowledgeChunk[]
}

export function KnowledgeBaseDetailRoute({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const knowledgeBaseQuery = useQuery<{ data: KnowledgeBaseDetail }>({
    queryKey: ['knowledge-base-detail-page', knowledgeBaseId],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}`)
      if (!response.ok) {
        throw new Error('Failed to load knowledge base')
      }
      return response.json()
    },
  })

  const knowledgeBase = knowledgeBaseQuery.data?.data
  const chunkCount = knowledgeBase?.knowledgeChunks?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
          <Link href="/knowledge-base">
            <ArrowLeft className="h-4 w-4" />
            Back to knowledge base
          </Link>
        </Button>
        <h1 className="text-display">Knowledge Base Detail</h1>
        <p className="text-subtitle">Chunk coverage, source metadata, and agent attachment health.</p>
      </div>

      {knowledgeBaseQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : knowledgeBase ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenText className="h-5 w-5 text-emerald-600" />
                {knowledgeBase.name}
              </CardTitle>
              <CardDescription>{knowledgeBase.description || 'No description provided'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{knowledgeBase.sourceType}</Badge>
                <Badge variant="outline">{chunkCount} chunks</Badge>
                <Badge variant="outline">{knowledgeBase.agentCount} agents</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DatabaseZap className="h-4 w-4" />
                    Embedded Chunks
                  </div>
                  <div className="mt-2 text-lg font-semibold">{chunkCount}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Attached Agents
                  </div>
                  <div className="mt-2 text-lg font-semibold">{knowledgeBase.agentCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chunk Preview</CardTitle>
              <CardDescription>Recent content chunks available to Hybrid RAG.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {knowledgeBase.knowledgeChunks && knowledgeBase.knowledgeChunks.length > 0 ? (
                knowledgeBase.knowledgeChunks.slice(0, 6).map((chunk) => (
                  <div key={chunk.id} className="rounded-xl border p-4 text-sm leading-6">
                    {chunk.content}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No chunks are currently attached to this knowledge base.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Knowledge base not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
