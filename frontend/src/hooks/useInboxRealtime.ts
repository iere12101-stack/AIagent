import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase'

// Global flag to track if conversations channel is already subscribed
let conversationsChannelSubscribed = false

// Global map to track message channels by conversationId
const messageChannels = new Map<string, any>()

export function useInboxRealtime(conversationId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Only create conversations channel if not already subscribed
    let conversationChannel: any = null
    if (!conversationsChannelSubscribed) {
      conversationChannel = supabaseBrowser
        .channel('conversations-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            if (conversationId) {
              queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
            }
          },
        )
        .subscribe()
      conversationsChannelSubscribed = true
    }

    // Always create message channel for specific conversation if not already exists
    if (conversationId && !messageChannels.has(conversationId)) {
      const messageChannel = supabaseBrowser
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
            queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
            setTimeout(() => {
              document.getElementById('message-scroll-anchor')?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          },
        )
        .subscribe()
      messageChannels.set(conversationId, messageChannel)
    }

    return () => {
      // Only remove conversations channel if this is the last component using it
      // For now, we'll keep it subscribed since we don't track usage count
      // In a more robust implementation, we'd use a ref count

      // Clean up message channel when conversation changes or component unmounts
      if (conversationId && messageChannels.has(conversationId)) {
        const channel = messageChannels.get(conversationId)
        void supabaseBrowser.removeChannel(channel)
        messageChannels.delete(conversationId)
      }
    }
  }, [conversationId, queryClient])
}
