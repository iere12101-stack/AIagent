import type { NextFunction, Response } from 'express'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

export function requireOrgScope(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  if (!request.auth?.orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  request.orgId = request.auth.orgId
  next()
}
