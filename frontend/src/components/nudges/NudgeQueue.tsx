'use client'

import { Ban, Bell, CalendarDays, MessageSquare, Phone, RotateCw, Send, XCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { NudgeRecord } from '@/types'

function formatDateTime(dateValue: string | null): string {
  if (!dateValue) {
    return '-'
  }

  return new Date(dateValue).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }

  return phone
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStatusStyles(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
    case 'sent':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300'
    default:
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
  }
}

interface NudgeQueueProps {
  nudges: NudgeRecord[]
  emptyMessage?: string
  onViewContact?: (nudge: NudgeRecord) => void
  onCancel?: (nudge: NudgeRecord) => void
  onResend?: (nudge: NudgeRecord) => void
}

export function NudgeQueue({
  nudges,
  emptyMessage = 'Nudge campaigns will appear here when scheduled.',
  onViewContact,
  onCancel,
  onResend,
}: NudgeQueueProps) {
  if (nudges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
        <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {nudges.map((nudge) => {
        const displayName = nudge.contact.name || formatPhone(nudge.contact.phone)

        return (
          <Card key={nudge.id} className="group card-hover">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {formatPhone(nudge.contact.phone)}
                  </div>
                </div>
                <Badge variant="outline" className={getStatusStyles(nudge.status)}>
                  {nudge.status}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Scheduled: {formatDateTime(nudge.scheduledAt)}
                </div>
                {nudge.sentAt ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Send className="h-3.5 w-3.5" />
                    Sent: {formatDateTime(nudge.sentAt)}
                  </div>
                ) : null}
                {nudge.cancelledAt ? (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    Cancelled: {formatDateTime(nudge.cancelledAt)}
                  </div>
                ) : null}
              </div>

              {nudge.messageSent ? (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message Preview
                  </div>
                  <p className="line-clamp-3 text-xs text-muted-foreground">
                    {nudge.messageSent}
                  </p>
                </div>
              ) : null}

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onViewContact?.(nudge)}>
                  Contact
                </Button>
                {nudge.status === 'pending' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs text-amber-700"
                    onClick={() => onCancel?.(nudge)}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                ) : null}
                {nudge.status === 'failed' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs text-emerald-700"
                    onClick={() => onResend?.(nudge)}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Resend
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default NudgeQueue
