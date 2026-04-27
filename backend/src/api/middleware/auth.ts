import type { NextFunction, Response } from 'express'
import { getSupabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null
  }

  const parts = cookieHeader.split(';').map((part) => part.trim())
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    const [key, ...value] = part.split('=')
    if (key === name) {
      return value.join('=')
    }
  }

  return null
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    sendApiError(response, 503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is not configured')
    return
  }

  const token =
    request.header('authorization')?.replace(/^Bearer\s+/i, '') ??
    readCookie(request.headers.cookie, 'sb-access-token')

  if (!token) {
    sendApiError(response, 401, 'UNAUTHORIZED', 'Authentication required')
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      sendApiError(response, 401, 'INVALID_SESSION', 'Invalid session token')
      return
    }

    const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
    const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const metadataOrgId =
      typeof appMetadata.org_id === 'string' ? appMetadata.org_id : null
    const metadataRole =
      typeof appMetadata.role === 'string' ? appMetadata.role : 'member'
    const metadataName =
      typeof userMetadata.name === 'string'
        ? userMetadata.name
        : user.email?.split('@')[0] ?? 'User'

    const { data: dbUserById, error: dbUserByIdError } = await supabase
      .from('users')
      .select('id, org_id, role, email')
      .eq('id', user.id)
      .maybeSingle()

    if (dbUserByIdError) {
      sendApiError(response, 500, 'AUTH_LOOKUP_FAILED', dbUserByIdError.message)
      return
    }

    let resolvedUser = dbUserById

    if (!resolvedUser && user.email) {
      let emailLookup = supabase
        .from('users')
        .select('id, org_id, role, email')
        .eq('email', user.email)
        .order('created_at', { ascending: true })
        .limit(1)

      if (metadataOrgId) {
        emailLookup = emailLookup.eq('org_id', metadataOrgId)
      }

      const { data: dbUserByEmail, error: dbUserByEmailError } =
        await emailLookup.maybeSingle()

      if (dbUserByEmailError) {
        sendApiError(response, 500, 'AUTH_LOOKUP_FAILED', dbUserByEmailError.message)
        return
      }

      resolvedUser = dbUserByEmail
    }

    if (resolvedUser) {
      request.auth = {
        userId: resolvedUser.id,
        orgId: resolvedUser.org_id,
        role: sanitizeRole(resolvedUser.role),
        email: resolvedUser.email,
      }
      next()
      return
    }

    const resolvedOrgId = metadataOrgId ?? (await resolveFallbackOrgId())
    if (!resolvedOrgId) {
      sendApiError(response, 401, 'USER_NOT_FOUND', 'Authenticated user was not found')
      return
    }

    if (user.email) {
      await ensureShadowUserMapping({
        id: user.id,
        orgId: resolvedOrgId,
        email: user.email,
        name: metadataName,
        role: metadataRole,
      })
    }

    request.auth = {
      userId: user.id,
      orgId: resolvedOrgId,
      role: sanitizeRole(metadataRole),
      email: user.email ?? '',
    }

    next()
  } catch (error) {
    sendApiError(
      response,
      500,
      'AUTH_RESOLUTION_FAILED',
      error instanceof Error ? error.message : 'Failed to resolve auth context',
    )
  }
}

function sanitizeRole(role: string): string {
  const allowedRoles = new Set(['owner', 'admin', 'operator', 'member', 'viewer'])
  return allowedRoles.has(role) ? role : 'member'
}

async function resolveFallbackOrgId(): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

async function ensureShadowUserMapping(input: {
  id: string
  orgId: string
  email: string
  name: string
  role: string
}): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('users').upsert(
    {
      id: input.id,
      org_id: input.orgId,
      email: input.email,
      name: input.name,
      role: sanitizeRole(input.role),
      password_hash: 'supabase_auth_managed',
      preferences: {},
      active: true,
    },
    { onConflict: 'id' },
  )

  if (error) {
    throw error
  }
}
