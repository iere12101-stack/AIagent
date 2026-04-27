'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock3, MessageSquare, Smartphone, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface DeviceDetail {
  id: string
  name: string
  phone: string
  status: string
  lastSeen: string
  createdAt: string
  conversationCount: number
}

export function DeviceDetailRoute({ deviceId }: { deviceId: string }) {
  const devicesQuery = useQuery<{ data: DeviceDetail[] }>({
    queryKey: ['device-detail-page', deviceId],
    queryFn: async () => {
      const response = await fetch('/api/devices', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load devices')
      }
      return response.json()
    },
    refetchInterval: 5000,
  })

  const device = devicesQuery.data?.data.find((item) => item.id === deviceId)

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 -ml-3 w-fit gap-2">
          <Link href="/devices">
            <ArrowLeft className="h-4 w-4" />
            Back to devices
          </Link>
        </Button>
        <h1 className="text-display">Device Detail</h1>
        <p className="text-subtitle">Connection health, activity, and WhatsApp session metadata.</p>
      </div>

      {devicesQuery.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : device ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                {device.name}
              </CardTitle>
              <CardDescription>WhatsApp device session overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className="w-fit">
                {device.status === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {device.status}
              </Badge>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="mt-2 font-semibold">{device.phone}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Conversations
                  </div>
                  <div className="mt-2 text-lg font-semibold">{device.conversationCount}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Last Seen
                  </div>
                  <div className="mt-2 font-semibold">{new Date(device.lastSeen).toLocaleString()}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">Added</div>
                  <div className="mt-2 font-semibold">{new Date(device.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connection Notes</CardTitle>
              <CardDescription>Operational guidance for reconnecting and troubleshooting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Use this page alongside the devices overview to verify the current connection state before reconnecting a session.</p>
              <p>If the device is disconnected, open the device list to reconnect and refresh the QR flow from the current Baileys session manager.</p>
              <p>The conversation count reflects how many conversations in this org are currently associated with this device session.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Device not found or unavailable for this organization.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
