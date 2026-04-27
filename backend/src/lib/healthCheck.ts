import IORedis from 'ioredis'
import { env } from '../config/env.js'
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'critical'
  timestamp: string
  uptime: number
  memory: { heapUsed: string; heapTotal: string }
  services: {
    database: 'ok' | 'slow' | 'down'
    claude: 'ok' | 'missing_key' | 'unknown'
    groq: 'ok' | 'missing_key' | 'unknown'
    openai: 'ok' | 'missing_key' | 'unknown'
    redis: 'ok' | 'down' | 'unknown'
  }
  whatsapp: {
    totalDevices: number
    connectedDevices: number
    disconnected: string[]
  }
  conversations: {
    humanHandled: number
    activeAI: number
  }
  alerts: string[]
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`[TIMEOUT] ${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

export async function runHealthCheck(): Promise<HealthStatus> {
  const mem = process.memoryUsage()
  const alerts: string[] = []
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024)

  let dbStatus: 'ok' | 'slow' | 'down' = 'down'
  let totalDevices = 0
  let connectedDevices = 0
  const disconnectedIds: string[] = []
  let humanHandled = 0
  let activeAI = 0

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()

    try {
      const startedAt = Date.now()
      await withTimeout(
        (async () => {
          await supabase.from('organizations').select('id').limit(1).throwOnError()
        })(),
        5_000,
        'Supabase health query',
      )
      const elapsed = Date.now() - startedAt
      dbStatus = elapsed > 3_000 ? 'slow' : 'ok'
      if (dbStatus === 'slow') {
        alerts.push(`Database slow: ${elapsed}ms`)
      }
    } catch {
      alerts.push('Database unreachable')
    }

    try {
      const { data: devices } = (await withTimeout(
        (async () => supabase.from('devices').select('id, status').throwOnError())(),
        5_000,
        'Device health query',
      )) as { data: Array<{ id: string; status: string }> | null }
      totalDevices = devices?.length ?? 0
      connectedDevices = devices?.filter((device: { id: string; status: string }) => device.status === 'connected').length ?? 0
      devices?.filter((device: { id: string; status: string }) => device.status !== 'connected').forEach((device: { id: string; status: string }) => {
        disconnectedIds.push(device.id)
      })
      if (totalDevices > 0 && connectedDevices === 0) {
        alerts.push(`No WhatsApp devices connected (${totalDevices} total)`)
      }
    } catch {
      alerts.push('Could not check WhatsApp device status')
    }

    try {
      const { data: conversations } = (await withTimeout(
        (async () =>
          supabase
            .from('conversations')
            .select('handled_by')
            .eq('status', 'active')
            .throwOnError())(),
        5_000,
        'Conversation health query',
      )) as { data: Array<{ handled_by: string | null }> | null }
      humanHandled =
        conversations?.filter((conversation: { handled_by: string | null }) => conversation.handled_by === 'human').length ?? 0
      activeAI =
        conversations?.filter((conversation: { handled_by: string | null }) => conversation.handled_by !== 'human').length ?? 0
      if (humanHandled > 20) {
        alerts.push(`${humanHandled} conversations are human-handled — may be stuck`)
      }
    } catch {
      alerts.push('Could not inspect conversation handoff state')
    }
  } else {
    alerts.push('Supabase is not configured')
  }

  const claudeStatus = env.ANTHROPIC_API_KEY ? 'ok' : 'missing_key'
  const groqStatus = env.GROQ_API_KEY ? 'ok' : 'missing_key'
  const openaiStatus = env.OPENAI_API_KEY ? 'ok' : 'missing_key'

  if (claudeStatus === 'missing_key') alerts.push('ANTHROPIC_API_KEY not set — Groq/OpenAI fallbacks only')
  if (groqStatus === 'missing_key') alerts.push('GROQ_API_KEY not set — no secondary AI fallback')
  if (openaiStatus === 'missing_key') alerts.push('OPENAI_API_KEY not set — no tertiary AI fallback')

  let redisStatus: 'ok' | 'down' | 'unknown' = 'unknown'
  if (env.REDIS_HOST && env.REDIS_PORT) {
    const client = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      connectTimeout: 3_000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    })

    try {
      await withTimeout(client.connect(), 3_000, 'Redis connect')
      await withTimeout(client.ping(), 3_000, 'Redis ping')
      redisStatus = 'ok'
    } catch {
      redisStatus = 'down'
      alerts.push('Redis unreachable')
    } finally {
      try {
        client.disconnect()
      } catch {
        // Ignore disconnect cleanup failures in the health endpoint.
      }
    }
  }

  if (heapMB > 450) {
    alerts.push(`High memory: ${heapMB}MB heap used — possible memory leak`)
  }

  const isCritical = dbStatus === 'down'
  const isDegraded = alerts.length > 0 && !isCritical

  return {
    status: isCritical ? 'critical' : isDegraded ? 'degraded' : 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsed: `${heapMB}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    },
    services: {
      database: dbStatus,
      claude: claudeStatus,
      groq: groqStatus,
      openai: openaiStatus,
      redis: redisStatus,
    },
    whatsapp: {
      totalDevices,
      connectedDevices,
      disconnected: disconnectedIds,
    },
    conversations: {
      humanHandled,
      activeAI,
    },
    alerts,
  }
}
