'use client'

import { useState, useCallback } from 'react'
import { ConversationList } from '@/components/inbox/ConversationList'
import { MessageThread } from '@/components/inbox/MessageThread'
import { ContactSidebar } from '@/components/inbox/ContactSidebar'

export default function InboxPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  const handleSelectConversation = useCallback((convId: string, contactId: string) => {
    setSelectedConvId(convId)
    setSelectedContactId(contactId)
  }, [])

  return (
    // ── CRITICAL: 3 columns ALWAYS. Never collapse right sidebar ──
    <div
      className="grid h-[calc(100vh-56px)] overflow-hidden"
      style={{ gridTemplateColumns: '320px 1fr 340px' }}
    >
      {/* Column 1: Conversation List */}
      <div className="border-r border-border overflow-hidden flex flex-col">
        <ConversationList
          selectedConvId={selectedConvId}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Column 2: Message Thread */}
      <div className="overflow-hidden flex flex-col">
        <MessageThread
          conversationId={selectedConvId}
        />
      </div>

      {/* Column 3: Contact Sidebar — ALWAYS RENDERED, NEVER HIDDEN */}
      <div className="border-l border-border overflow-hidden flex flex-col">
        <ContactSidebar
          conversationId={selectedConvId}
          contactId={selectedContactId}
        />
      </div>
    </div>
  )
}
