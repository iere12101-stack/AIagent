import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireOrgScope } from '../middleware/orgScope.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

router.get('/me', requireAuth, requireOrgScope, (request: AuthenticatedRequest, response) => {
  response.json({
    success: true,
    data: request.auth,
  })
})

router.post('/logout', requireAuth, (_request, response) => {
  response.json({
    success: true,
    data: { loggedOut: true },
  })
})

export default router
