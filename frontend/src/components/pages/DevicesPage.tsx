'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Device {
  id: string
  name: string
  phone: string | null
  status: string
  runtimeStatus?: string | null
  isLiveConnected?: boolean
  lastSeen: string | null
  createdAt: string
  conversationCount?: number
}

interface DevicesResponse {
  data: Device[]
}

interface DeviceQrState {
  id: string
  status: string
  runtimeStatus?: string | null
  isLiveConnected?: boolean
  qr: string | null
  qrImage: string | null
  updatedAt: string | null
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) {
    return 'not available'
  }

  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPhone(phone: string | null): string {
  if (!phone) {
    return 'Unlinked'
  }

  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`
  if (digits.length === 10) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  return phone
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'connected':
      return {
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-950',
        badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        label: 'Connected',
        icon: <Wifi className="h-4 w-4" />,
      }
    case 'connecting':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-950',
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        label: 'Connecting',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      }
    default:
      return {
        color: 'text-gray-500 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-800',
        badgeBg: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        dot: 'bg-gray-400',
        label: 'Disconnected',
        icon: <WifiOff className="h-4 w-4" />,
      }
  }
}

function DeviceCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function PulsingDot({ color, connecting }: { color: string; connecting?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {connecting && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  )
}

export function DevicesPage() {
  const [connectOpen, setConnectOpen] = useState(false)
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [qrState, setQrState] = useState<DeviceQrState | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const devicesQuery = useQuery<DevicesResponse>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await fetch('/api/devices', { cache: 'no-store', credentials: 'include' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to fetch devices')
      }
      return payload
    },
    refetchInterval: (query) => {
      const rows = (query.state.data as DevicesResponse | undefined)?.data ?? []
      const hasConnectingDevice = rows.some((item) => item.status === 'connecting')
      return connectOpen || hasConnectingDevice ? 3000 : 15000
    },
    refetchOnWindowFocus: true,
  })

  const devices = useMemo(() => devicesQuery.data?.data ?? [], [devicesQuery.data])

  const loadQr = useCallback(async (deviceId: string) => {
    const response = await fetch(`/api/devices/${deviceId}/qr`, { cache: 'no-store', credentials: 'include' })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error ?? 'Failed to load QR code')
    }

    return payload.data as DeviceQrState
  }, [])

  useEffect(() => {
    if (!connectOpen || !activeDeviceId) {
      return
    }

    let cancelled = false

    const syncQr = async () => {
      try {
        const nextState = await loadQr(activeDeviceId)
        if (cancelled) {
          return
        }

        setQrState(nextState)
        setDialogError(null)

        if (nextState.status === 'connected') {
          void devicesQuery.refetch()
        }
      } catch (error) {
        if (!cancelled) {
          setDialogError(error instanceof Error ? error.message : 'Failed to load QR code')
        }
      }
    }

    void syncQr()
    const interval = window.setInterval(() => {
      void syncQr()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [activeDeviceId, connectOpen, devicesQuery, loadQr])

  const startConnection = useCallback(async (deviceId: string) => {
    setActionLoading(deviceId)
    setActiveDeviceId(deviceId)
    setQrState(null)
    setDialogError(null)
    setConnectOpen(true)

    try {
      const response = await fetch(`/api/devices/${deviceId}/connect`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to connect device')
      }

      await devicesQuery.refetch()
      const freshQr = await loadQr(deviceId)
      setQrState(freshQr)
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to connect device')
    } finally {
      setActionLoading(null)
    }
  }, [devicesQuery, loadQr])

  const handleDisconnect = useCallback(async (deviceId: string) => {
    setActionLoading(deviceId)

    try {
      const response = await fetch(`/api/devices/${deviceId}/disconnect`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to disconnect device')
      }

      if (activeDeviceId === deviceId) {
        setQrState(null)
      }
      await devicesQuery.refetch()
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to disconnect device')
    } finally {
      setActionLoading(null)
    }
  }, [activeDeviceId, devicesQuery])

  const handleDelete = useCallback(async (device: Device) => {
    if (device.status === 'connected' || device.status === 'connecting') {
      setDialogError('Disconnect this device before deleting it.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${device.name}"?\n\nThis removes the device and its WhatsApp session keys from this workspace.`,
    )
    if (!confirmed) {
      return
    }

    setActionLoading(`delete:${device.id}`)
    setDialogError(null)

    try {
      const response = await fetch(`/api/devices/${device.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({ error: 'Failed to delete device' }))
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete device')
      }

      if (activeDeviceId === device.id) {
        setActiveDeviceId(null)
        setQrState(null)
      }

      await devicesQuery.refetch()
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to delete device')
    } finally {
      setActionLoading(null)
    }
  }, [activeDeviceId, devicesQuery])

  const handleCreateAndConnect = useCallback(async () => {
    const trimmedName = deviceName.trim()
    if (!trimmedName) {
      setDialogError('Please enter a device name')
      return
    }

    setActionLoading('create')
    setDialogError(null)

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: trimmedName }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create device')
      }

      const deviceId = payload.data?.id as string | undefined
      if (!deviceId) {
        throw new Error('Device creation did not return an id')
      }

      setDeviceName('')
      await devicesQuery.refetch()
      await startConnection(deviceId)
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to create device')
      setActionLoading(null)
    }
  }, [deviceName, devicesQuery, startConnection])

  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? null
  const connectTitle = activeDevice ? `Connect ${activeDevice.name}` : 'Connect New Device'
  const qrStatusText =
    qrState?.status === 'connected'
      ? 'Device connected successfully.'
      : qrState?.qr
        ? 'Scan this QR code from WhatsApp Linked Devices.'
        : 'Waiting for WhatsApp to issue a QR code.'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-emerald-600" />
            WhatsApp Devices
          </h1>
          <p className="text-subtitle">Baileys sessions management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="press-scale"
            onClick={() => devicesQuery.refetch()}
            disabled={devicesQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${devicesQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog
            open={connectOpen}
            onOpenChange={(open) => {
              setConnectOpen(open)
              if (!open) {
                setActiveDeviceId(null)
                setQrState(null)
                setDialogError(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-600 text-white press-scale hover:bg-emerald-700"
                onClick={() => {
                  setActiveDeviceId(null)
                  setQrState(null)
                  setDialogError(null)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Connect Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{connectTitle}</DialogTitle>
                <DialogDescription>
                  Create a new WhatsApp session or finish linking the selected device.
                </DialogDescription>
              </DialogHeader>

              {!activeDevice && (
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="Reception iPhone"
                    value={deviceName}
                    onChange={(event) => setDeviceName(event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-4 py-2">
                <div className="flex items-center justify-center py-4">
                  <div className="flex min-h-[320px] w-full max-w-[320px] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                    {qrState?.qrImage ? (
                      <img
                        src={qrState.qrImage}
                        alt="WhatsApp device QR code"
                        className="h-64 w-64 rounded-lg border bg-white p-2"
                      />
                    ) : qrState?.status === 'connected' ? (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Wifi className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Device connected
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <QrCode className="mx-auto h-24 w-24 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          QR code will appear as soon as WhatsApp generates it.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">{qrStatusText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open WhatsApp on the phone, go to Linked Devices, and scan the code.
                  </p>
                  {qrState?.updatedAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last updated {formatTimeAgo(qrState.updatedAt)}
                    </p>
                  ) : null}
                  {dialogError ? (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{dialogError}</p>
                  ) : null}
                  {qrState?.runtimeStatus ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Runtime status: {qrState.runtimeStatus}
                    </p>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="gap-2">
                {!activeDevice ? (
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => void handleCreateAndConnect()}
                    disabled={actionLoading === 'create'}
                  >
                    {actionLoading === 'create' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create and Connect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => activeDeviceId && void startConnection(activeDeviceId)}
                    disabled={actionLoading === activeDeviceId}
                  >
                    {actionLoading === activeDeviceId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh QR
                  </Button>
                )}
                <Button variant="outline" onClick={() => setConnectOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {devicesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <DeviceCardSkeleton key={index} />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon mb-4 rounded-full bg-muted p-4">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No devices connected</h3>
          <p className="empty-state-text mb-4 max-w-[260px] text-sm text-muted-foreground">
            Connect your first WhatsApp device to start receiving and sending messages.
          </p>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setConnectOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Connect Device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => {
            const statusConfig = getStatusConfig(device.status)
            const isConnectLoading = actionLoading === device.id
            const isDeleteLoading = actionLoading === `delete:${device.id}`

            return (
              <Card key={device.id} className="group card-hover">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 rounded-lg p-3 ${statusConfig.bg}`}>
                      <Smartphone className={`h-6 w-6 ${statusConfig.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{device.name}</h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {formatPhone(device.phone)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`flex items-center gap-1.5 text-[11px] ${statusConfig.badgeBg}`}>
                      <PulsingDot color={statusConfig.dot} connecting={device.status === 'connecting'} />
                      {statusConfig.label}
                    </Badge>
                    {device.conversationCount != null && (
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <MessageSquare className="h-3 w-3" />
                        {device.conversationCount} conversations
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Last seen: {formatTimeAgo(device.lastSeen)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        Added:{' '}
                        {new Date(device.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-end gap-2">
                    {device.status === 'connected' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-red-300 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => void handleDisconnect(device.id)}
                          disabled={isConnectLoading || isDeleteLoading}
                        >
                          {isConnectLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PowerOff className="h-3.5 w-3.5" />
                          )}
                          Disconnect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setActiveDeviceId(device.id)
                            setDialogError(null)
                            setConnectOpen(true)
                          }}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          QR Code
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        onClick={() => void startConnection(device.id)}
                        disabled={isConnectLoading || isDeleteLoading}
                      >
                        {isConnectLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                        {device.status === 'connecting' ? 'Reconnect' : 'Connect'}
                      </Button>
                    )}
                    {device.status === 'disconnected' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-red-300 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => void handleDelete(device)}
                        disabled={isConnectLoading || isDeleteLoading}
                      >
                        {isDeleteLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
