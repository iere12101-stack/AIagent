'use client'

import { cn } from '@/lib/utils'
import { Bot, User, UserCircle, Info } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  conversationId: string
  direction: string       // inbound, outbound
  senderType: string      // ai, human, contact, system
  senderName: string | null
  content: string
  messageType: string     // text, image, document, location
  metadata: string | null
  createdAt: string
}

interface MessageBubbleProps {
  message: Message
  contactName?: string
  contactInitials?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) return time
  if (isYesterday) return `Yesterday, ${time}`
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Main Component ───────────────────────────────────────────────────────────

export function MessageBubble({ message, contactName, contactInitials }: MessageBubbleProps) {
  const isSystem = message.senderType === 'system'
  const isInbound = message.direction === 'inbound'
  const isOutbound = message.direction === 'outbound'

  // System message — centered, muted
  if (isSystem) {
    return (
      <div className="flex justify-center my-3 px-4">
        <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs px-3 py-1.5 rounded-full max-w-[80%]">
          <Info className="h-3 w-3 shrink-0" />
          <span className="text-center">{message.content}</span>
        </div>
      </div>
    )
  }

  // Inbound message — left-aligned, gray bg
  if (isInbound) {
    return (
      <div className="flex items-end gap-2 max-w-[75%]">
        {/* Avatar */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300">
          {contactInitials || getInitials(contactName || 'U')}
        </div>
        <div className="flex flex-col gap-0.5">
          {/* Sender label */}
          <p className="text-[10px] text-muted-foreground pl-1">
            {contactName || 'Contact'}
          </p>
          {/* Bubble */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          {/* Time */}
          <p className="text-[10px] text-muted-foreground pl-1 mt-0.5">
            {formatMessageTime(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  // Outbound message — right-aligned, emerald bg
  return (
    <div className="flex items-end gap-2 max-w-[75%] ml-auto flex-row-reverse">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
        {message.senderType === 'ai' ? (
          <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 items-end">
        {/* Sender label */}
        <p className="text-[10px] text-muted-foreground pr-1">
          {message.senderType === 'ai' ? 'AI Bot' : message.senderName || 'Human Agent'}
        </p>
        {/* Bubble */}
        <div className="bg-emerald-500 text-white rounded-2xl rounded-br-md px-3 py-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        {/* Time */}
        <p className="text-[10px] text-muted-foreground pr-1 mt-0.5">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function MessageBubbleSkeleton() {
  return (
    <div className="flex items-end gap-2 max-w-[60%]">
      <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
      <div className="space-y-1.5">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="bg-muted rounded-2xl px-3 py-2">
          <div className="h-3 w-40 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-3 w-28 bg-muted-foreground/20 rounded animate-pulse mt-1.5" />
        </div>
      </div>
    </div>
  )
}
