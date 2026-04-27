'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Bell, X } from 'lucide-react'
import { NotificationFeed, useNotificationState } from './NotificationFeed'

interface NotificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unreadCount: number
}

function NotificationSheet({ open, onOpenChange, unreadCount }: NotificationSheetProps) {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const handleViewAll = useCallback(() => {
    setCurrentPage('activity-log')
    onOpenChange(false)
  }, [setCurrentPage, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SheetTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge className="badge-emerald text-[10px] px-1.5 py-0 h-5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Your notification feed with {unreadCount} unread notifications
          </SheetDescription>
        </SheetHeader>

        <Separator className="mt-3 opacity-50" />

        <div className="flex-1 flex flex-col min-h-0">
          <NotificationFeed onViewAll={handleViewAll} compact />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationState()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] w-auto px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0 notif-bounce badge-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
        <span className="sr-only">Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}</span>
      </Button>
      <NotificationSheet
        open={open}
        onOpenChange={setOpen}
        unreadCount={unreadCount}
      />
    </>
  )
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationState()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] w-auto px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0 notif-bounce badge-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
        <span className="sr-only">Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}</span>
      </Button>
      <NotificationSheet
        open={open}
        onOpenChange={setOpen}
        unreadCount={unreadCount}
      />
    </>
  )
}
