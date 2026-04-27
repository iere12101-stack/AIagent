import type { Request } from 'express'

export interface AuthContext {
  userId: string
  orgId: string
  role: string
  email: string
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext
  orgId?: string
}
