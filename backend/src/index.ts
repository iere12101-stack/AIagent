import express from 'express'
import type { Server } from 'node:http'
import { degradedServices, env, envIssues } from './config/env.js'
import { BUILD_ID, PIPELINE_VERSION, buildRuntimeFingerprint } from './config/runtimeFingerprint.js'
import agentsRouter from './api/routes/agents.js'
import analyticsRouter from './api/routes/analytics.js'
import authRouter from './api/routes/auth.js'
import chatRouter from './api/routes/chat.js'
import bookingsRouter from './api/routes/bookings.js'
import contactsRouter from './api/routes/contacts.js'
import conversationsRouter from './api/routes/conversations.js'
import devicesRouter from './api/routes/devices.js'
import flowsRouter from './api/routes/flows.js'
import knowledgeRouter from './api/routes/knowledge.js'
import messagesRouter from './api/routes/messages.js'
import nudgesRouter from './api/routes/nudges.js'
import propertiesRouter from './api/routes/properties.js'
import settingsRouter from './api/routes/settings.js'
import { requireAuth } from './api/middleware/auth.js'
import { requireOrgScope } from './api/middleware/orgScope.js'
import { apiRateLimit } from './api/middleware/rateLimit.js'
import healthRouter from './routes/health.js'
import { whatsAppGateway } from './whatsapp/WhatsAppGateway.js'

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[PROCESS] Unhandled Promise Rejection:', reason)
  console.error('[PROCESS] Promise:', promise)
})

process.on('uncaughtException', (error: Error) => {
  console.error('[PROCESS] Uncaught Exception:', error.message)
  console.error('[PROCESS] Stack:', error.stack)

  if (/ENOMEM|out of memory/i.test(error.message)) {
    console.error('[PROCESS] OOM error — process will restart')
    process.exit(1)
  }
})

setInterval(() => {
  const used = process.memoryUsage()
  const heapMB = Math.round(used.heapUsed / 1024 / 1024)
  if (heapMB > 400) {
    console.warn(`[PROCESS] High memory usage: ${heapMB}MB heap used`)
  }
}, 5 * 60 * 1000)

process.env.TZ = env.TZ

const nodeMajor = Number(process.versions.node.split('.')[0] ?? '0')
if (nodeMajor !== 22) {
  console.warn(
    `Node.js ${process.versions.node} detected. WhatsApp/Baileys stability is validated on Node.js 22 LTS.`,
  )
}

const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/', (_request, response) => {
  response.status(200).json({
    ok: true,
    service: 'iere-whatsapp-backend',
    buildId: BUILD_ID,
    pipelineVersion: PIPELINE_VERSION,
  })
})

app.get('/healthz', (_request, response) => {
  response.status(200).json({
    ok: true,
    service: 'iere-whatsapp-backend',
    buildId: BUILD_ID,
    pipelineVersion: PIPELINE_VERSION,
    uptime: Math.round(process.uptime()),
  })
})

app.use('/api/v1/health', healthRouter)

app.get('/api/v1/setup/status', (_request, response) => {
  const runtimeFingerprint = buildRuntimeFingerprint(port, whatsAppGateway.getConnectedDeviceIds())
  response.json({
    success: true,
    data: {
      runtimeFingerprint,
      degradedServices,
      envIssues,
      timezone: env.TZ,
      ready: envIssues.length === 0,
      whatsappRuntime: whatsAppGateway.getRuntimeSnapshotSummary(),
    },
  })
})

app.use('/api/v1/auth', apiRateLimit, authRouter)
app.use('/api/v1/chat', apiRateLimit, requireAuth, requireOrgScope, chatRouter)
app.use('/api/v1/devices', apiRateLimit, requireAuth, requireOrgScope, devicesRouter)
app.use('/api/v1/contacts', apiRateLimit, requireAuth, requireOrgScope, contactsRouter)
app.use('/api/v1/conversations', apiRateLimit, requireAuth, requireOrgScope, conversationsRouter)
app.use('/api/v1/messages', apiRateLimit, requireAuth, requireOrgScope, messagesRouter)
app.use('/api/v1/properties', apiRateLimit, requireAuth, requireOrgScope, propertiesRouter)
app.use('/api/v1/agents', apiRateLimit, requireAuth, requireOrgScope, agentsRouter)
app.use('/api/v1/knowledge', apiRateLimit, requireAuth, requireOrgScope, knowledgeRouter)
app.use('/api/v1/flows', apiRateLimit, requireAuth, requireOrgScope, flowsRouter)
app.use('/api/v1/bookings', apiRateLimit, requireAuth, requireOrgScope, bookingsRouter)
app.use('/api/v1/analytics', apiRateLimit, requireAuth, requireOrgScope, analyticsRouter)
app.use('/api/v1/nudges', apiRateLimit, requireAuth, requireOrgScope, nudgesRouter)
app.use('/api/v1/settings', apiRateLimit, requireAuth, requireOrgScope, settingsRouter)

const port = env.PORT
let server: Server | null = null
let hasBootstrappedGateway = false

function startServer(attempt = 0): void {
  const listener = app.listen(port, async () => {
    server = listener
    if (!hasBootstrappedGateway) {
      hasBootstrappedGateway = true
      await whatsAppGateway.bootstrap().catch(() => undefined)
    }
    console.info(
      `[PIPELINE] fingerprint=${JSON.stringify(buildRuntimeFingerprint(port, whatsAppGateway.getConnectedDeviceIds()))} buildId=${BUILD_ID} entry=src/index.ts path=Baileys>MessageRouter>modules/ai`,
    )
    console.info(`IERE WhatsApp backend running on port ${port}`)
  })

  listener.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && attempt < 10) {
      const nextAttempt = attempt + 1
      const delayMs = 500 * nextAttempt
      console.warn(
        `Port ${port} is busy. Retrying backend bind in ${delayMs}ms (attempt ${nextAttempt}/10).`,
      )
      setTimeout(() => {
        startServer(nextAttempt)
      }, delayMs)
      return
    }

    console.error('Failed to start backend server:', error)
    process.exit(1)
  })
}

startServer()

async function shutdown(signal: string): Promise<void> {
  console.info(`Received ${signal}, shutting down backend`)
  await whatsAppGateway.shutdown().catch(() => undefined)
  if (server) {
    server.close(() => {
      process.exit(0)
    })
    return
  }
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
