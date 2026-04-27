import type { NextFunction, Response } from 'express'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 120
const counters = new Map<string, { count: number; resetAt: number }>()

export function apiRateLimit(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const key = `${request.ip ?? 'unknown'}:${request.baseUrl || request.path}`
  const now = Date.now()
  const entry = counters.get(key)

  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS })
    next()
    return
  }

  if (entry.count >= MAX_REQUESTS) {
    sendApiError(response, 429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.')
    return
  }

  entry.count += 1
  next()
}
