'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Plus,
  Upload,
  Eye,
  Edit3,
  Trash2,
  FileText,
  Layers,
  Bot,
  X,
  CalendarDays,
  Pencil,
  PlusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeBase {
  id: string
  orgId: string
  name: string
  description: string | null
  sourceType: string
  createdAt: string
  chunkCount: number
  agentCount: number
}

interface KBChunk {
  id: string
  knowledgeBaseId: string
  content: string
  embeddingId: string | null
  createdAt: string
}

interface KnowledgeBaseDetail extends KnowledgeBase {
  chunks: KBChunk[]
}

interface Agent {
  id: string
  name: string
  knowledgeBaseId: string | null
  knowledgeBase?: { id: string; name: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSourceTypeBadge(type: string): { color: string; label: string } {
  switch (type) {
    case 'faq': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', label: 'FAQ' }
    case 'document': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', label: 'Document' }
    case 'manual': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', label: 'Manual' }
    case 'guide': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Guide' }
    default: return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: type }
  }
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function KBCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function KnowledgeBasePage() {
  // ── State ─────────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<KnowledgeBase | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────
  const kbsQuery = useQuery<{ data: KnowledgeBase[] }>({
    queryKey: ['knowledge-bases'],
    queryFn: () => fetch('/api/knowledge-bases').then((r) => r.json()),
  })

  const agentsQuery = useQuery<{ data: Agent[] }>({
    queryKey: ['agents'],
    queryFn: () => fetch('/api/agents').then((r) => r.json()),
  })

  const kbDetailQuery = useQuery<{ data: KnowledgeBaseDetail }>({
    queryKey: ['kb-detail', selectedKBId],
    queryFn: () => fetch(`/api/knowledge-bases/${selectedKBId}`).then((r) => r.json()),
    enabled: !!selectedKBId && sheetOpen,
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleViewKB = useCallback((kb: KnowledgeBase) => {
    setSelectedKBId(kb.id)
    setSheetOpen(true)
  }, [])

  const getAgentsForKB = useCallback((kbId: string): string[] => {
    const agents = agentsQuery.data?.data ?? []
    return agents.filter((a) => a.knowledgeBaseId === kbId).map((a) => a.name)
  }, [agentsQuery.data])

  // ── Render ────────────────────────────────────────────────────────────
  const knowledgeBases = kbsQuery.data?.data ?? []
  const kbDetail = kbDetailQuery.data?.data

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Knowledge Base
          </h1>
          <p className="text-subtitle">RAG-powered documents for AI responses</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white press-scale">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Add a new document to the knowledge base. Supported formats: PDF, TXT, MD, DOCX.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-name">Knowledge Base Name</Label>
                <Input id="kb-name" placeholder="e.g., Dubai Market FAQ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-desc">Description</Label>
                <Input id="kb-desc" placeholder="Brief description of the document" />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select defaultValue="document">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KB Cards Grid */}
      {kbsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <KBCardSkeleton key={i} />)}
        </div>
      ) : knowledgeBases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No knowledge bases</h3>
          <p className="empty-state-text text-sm text-muted-foreground max-w-[260px] mb-4">
            Upload your first document to start building the AI&apos;s knowledge base.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {knowledgeBases.map((kb) => {
            const sourceBadge = getSourceTypeBadge(kb.sourceType)
            const agentNames = getAgentsForKB(kb.id)

            return (
              <Card key={kb.id} className="group card-hover">
                <CardContent className="p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2.5 shrink-0">
                      <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{kb.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {kb.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`tag-pill inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${sourceBadge.color}`}>
                      {sourceBadge.label}
                    </span>
                    <Badge variant="outline" className="text-[11px] gap-1">
                      <FileText className="h-3 w-3" />
                      {kb.chunkCount} chunks
                    </Badge>
                    {kb.agentCount > 0 && (
                      <Badge variant="outline" className="text-[11px] gap-1">
                        <Bot className="h-3 w-3" />
                        {kb.agentCount} agents
                      </Badge>
                    )}
                  </div>

                  {/* Agents using this KB */}
                  {agentNames.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Used by:</span>
                      {agentNames.map((name) => (
                        <Badge key={name} variant="secondary" className="text-[10px] h-5">{name}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Created */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Created {new Date(kb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewKB(kb)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteDialog(kb)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KB Detail Sheet                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedKBId(null) }}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Knowledge Base Detail</SheetTitle>
            <SheetDescription>View and manage knowledge base</SheetDescription>
          </SheetHeader>

          {kbDetailQuery.isLoading ? (
            <div className="space-y-4 px-4 pt-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-3 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ) : kbDetail ? (
            <div className="space-y-6 px-4 pt-2 pb-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getSourceTypeBadge(kbDetail.sourceType).color}`}>
                    {getSourceTypeBadge(kbDetail.sourceType).label}
                  </span>
                </div>
                <h2 className="text-lg font-semibold">{kbDetail.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{kbDetail.description || 'No description'}</p>
              </div>

              <Separator />

              {/* Editable Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={kbDetail.name} className="text-sm" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                  <div className="flex items-start gap-2">
                    <Input defaultValue={kbDetail.description || ''} className="text-sm" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Chunks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Chunks ({kbDetail.chunks.length})
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <PlusCircle className="h-3 w-3" />
                    Add Chunk
                  </Button>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {kbDetail.chunks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No chunks in this knowledge base</p>
                      </div>
                    ) : (
                      kbDetail.chunks.map((chunk, index) => (
                        <div key={chunk.id} className="rounded-lg border p-3 hover:bg-accent/50 transition-colors group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  #{index + 1}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(chunk.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3">{chunk.content}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
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
            <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? This will remove all {deleteDialog?.chunkCount} chunks.
              This action cannot be undone.
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
