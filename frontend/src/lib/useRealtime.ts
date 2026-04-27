'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const REALTIME_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true'
const REALTIME_URL = (process.env.NEXT_PUBLIC_REALTIME_URL ?? '').trim()
const MAX_ACTIVITIES = 30

export interface RealtimeStats {
  activeConversations: number
  unreadMessages: number
  newLeads: number
  pendingBookings: number
  activeDevices: number
}

export interface RealtimeActivity {
  id: string
  icon: string
  text: string
  time: string
  color: string
}

export interface RealtimeState {
  isConnected: boolean
  stats: RealtimeStats | null
  activities: RealtimeActivity[]
}

export function useRealtime(): RealtimeState {
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<RealtimeStats | null>(null)
  const [activities, setActivities] = useState<RealtimeActivity[]>([])
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (!REALTIME_ENABLED) {
      return
    }

    if (socketRef.current?.connected) return

    const options = {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 12000,
      timeout: 15000,
    }

    const socket = REALTIME_URL.length > 0
      ? io(REALTIME_URL, options)
      : io(options)

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      setIsConnected(false)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useRealtime] Connection error:', error.message)
      }
    })

    socket.on('dashboard-stats', (payload: { type: string; data: RealtimeStats }) => {
      if (payload.type === 'dashboard-stats' && payload.data) {
        setStats(payload.data)
      }
    })

    socket.on('activity', (payload: { type: string; data: RealtimeActivity }) => {
      if (payload.type === 'activity' && payload.data) {
        setActivities((previous) => {
          if (previous.some((activity) => activity.id === payload.data.id)) return previous
          return [payload.data, ...previous].slice(0, MAX_ACTIVITIES)
        })
      }
    })
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [connect])

  return { isConnected, stats, activities }
}
