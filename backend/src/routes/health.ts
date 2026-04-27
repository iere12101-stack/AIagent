import { Router } from 'express'
import { runHealthCheck } from '../lib/healthCheck.js'

const router = Router()

router.get('/', async (_request, response) => {
  try {
    const health = await runHealthCheck()
    const httpStatus = health.status === 'critical' ? 503 : 200
    response.status(httpStatus).json(health)
  } catch (error) {
    response.status(503).json({
      status: 'critical',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
