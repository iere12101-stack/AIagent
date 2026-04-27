import { createServer } from 'http'
import { Server } from 'socket.io'

// ── Server Setup ─────────────────────────────────────────────────────────────

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const PORT = 3004

// ── Connection Handling ──────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`)

  // Send empty stats on connection
  socket.emit('dashboard-stats', {
    type: 'dashboard-stats',
    data: {
      activeConversations: 0,
      unreadMessages: 0,
      newLeads: 0,
      pendingBookings: 0,
      activeDevices: 0,
    },
  })

  socket.on('disconnect', () => {
    console.log(`[Realtime] Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[Realtime] Socket error (${socket.id}):`, error)
  })
})

// TODO: Replace with Supabase Realtime subscription when database is configured
// The following will be replaced with real-time listeners on:
// - conversations table (new/updated/deleted)
// - messages table (new messages)
// - contacts table (lead score changes)
// - bookings table (status changes)

// ── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[Realtime] IERE Real-Time Dashboard Service running on port ${PORT}`)
})

// ── Graceful Shutdown ────────────────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`[Realtime] Received ${signal}, shutting down...`)
  io.close()
  httpServer.close(() => {
    console.log('[Realtime] Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
