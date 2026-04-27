'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, SendHorizontal, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { QUICK_REPLY_CATALOG } from '@/lib/inbox-quick-replies'

export function MessageInput({
  conversationId,
  agentId,
}: {
  conversationId: string
  agentId?: string | null
}) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)

  const quickReplyCountQuery = useQuery<number>({
    queryKey: ['quick-reply-count', agentId ?? 'default'],
    queryFn: async () => {
      const response = await fetch(`/api/v1/agents/${agentId ?? 'default'}/quick-replies/count`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load quick replies count')
      const payload = (await response.json()) as { count: number }
      return payload.count
    },
    staleTime: 60_000,
  })

  const suggestionQuery = useQuery<string[]>({
    queryKey: ['suggested-replies', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/conversations/${conversationId}/suggest-replies`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load suggested replies')
      const payload = (await response.json()) as { data: string[] }
      return payload.data ?? []
    },
    enabled: Boolean(conversationId),
  })

  useEffect(() => {
    setDismissedSuggestions(false)
  }, [conversationId])

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          senderName: 'Agent',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to send message' }))
        throw new Error(payload.error || 'Failed to send message')
      }
      return response.json()
    },
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/conversations/${conversationId}/suggest-replies`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to regenerate suggestions')
      return response.json()
    },
    onSuccess: () => {
      setDismissedSuggestions(false)
      queryClient.invalidateQueries({ queryKey: ['suggested-replies', conversationId] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="border-t border-border bg-card">
      {!dismissedSuggestions && suggestionQuery.data && suggestionQuery.data.length > 0 ? (
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-[#25D453]" />
              AI Suggested Replies
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white/35 hover:bg-white/[0.06] hover:text-white"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                <RefreshCw className={`h-3 w-3 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white/35 hover:bg-white/[0.06] hover:text-white"
                onClick={() => setDismissedSuggestions(true)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestionQuery.data.map((suggestion) => (
              <button
                key={suggestion}
                className="whitespace-nowrap rounded-full border border-[#25D453]/20 bg-[#25D453]/10 px-3 py-1.5 text-xs text-[#25D453] transition-colors hover:bg-[#25D453]/20"
                onClick={() => setMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-b border-white/[0.06] px-4 py-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/55">Quick Replies ({quickReplyCountQuery.data ?? QUICK_REPLY_CATALOG.length})</span>
          <span className="text-[10px] text-white/25">Shift+Enter newline</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {QUICK_REPLY_CATALOG.slice(0, 10).map((reply) => (
            <button
              key={reply.id}
              className="whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              onClick={() => setMessage(reply.text)}
            >
              {reply.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3 px-4 py-3">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (message.trim()) {
                sendMutation.mutate(message.trim())
              }
            }
          }}
          rows={1}
          placeholder="Type a message..."
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <Button
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => message.trim() && sendMutation.mutate(message.trim())}
          disabled={!message.trim() || sendMutation.isPending}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
