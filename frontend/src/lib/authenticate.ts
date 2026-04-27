import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './supabase'

export interface AuthContext {
  userId: string
  orgId: string
  role: string
  email: string
  name: string
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const token = request.cookies.get('sb-access-token')?.value
    || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    const resp = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
    throw resp
  }

  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    const resp = NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    )
    throw resp
  }

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const metadataOrgId = typeof appMetadata.org_id === 'string' ? appMetadata.org_id : null
  const metadataRole = typeof appMetadata.role === 'string' ? appMetadata.role : 'member'
  const metadataName =
    typeof userMetadata.name === 'string'
      ? userMetadata.name
      : user.email?.split('@')[0] ?? 'User'

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, org_id, role, email, name')
    .eq('id', user.id)
    .maybeSingle()

  if (dbUser) {
    return {
      userId: dbUser.id,
      orgId: dbUser.org_id,
      role: dbUser.role,
      email: dbUser.email,
      name: dbUser.name,
    }
  }

  if (user.email) {
    let emailQuery = supabase
      .from('users')
      .select('id, org_id, role, email, name')
      .eq('email', user.email)
      .order('created_at', { ascending: true })
      .limit(1)

    if (metadataOrgId) {
      emailQuery = emailQuery.eq('org_id', metadataOrgId)
    }

    const { data: dbUserByEmail } = await emailQuery.maybeSingle()

    if (dbUserByEmail) {
      return {
        userId: dbUserByEmail.id,
        orgId: dbUserByEmail.org_id,
        role: dbUserByEmail.role,
        email: dbUserByEmail.email,
        name: dbUserByEmail.name,
      }
    }
  }

  const resolvedOrgId = metadataOrgId ?? await resolveFallbackOrgId(supabase)

  if (!resolvedOrgId) {
    const resp = NextResponse.json(
      { error: 'User not found' },
      { status: 401 }
    )
    throw resp
  }

  await ensureShadowUserMapping(supabase, {
    id: user.id,
    orgId: resolvedOrgId,
    email: user.email ?? '',
    name: metadataName,
    role: metadataRole,
  })

  return {
    userId: user.id,
    orgId: resolvedOrgId,
    role: metadataRole,
    email: user.email ?? '',
    name: metadataName,
  }
}

async function resolveFallbackOrgId(
  supabase: ReturnType<typeof createServerClient>,
): Promise<string | null> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

async function ensureShadowUserMapping(
  supabase: ReturnType<typeof createServerClient>,
  input: {
    id: string
    orgId: string
    email: string
    name: string
    role: string
  },
): Promise<void> {
  if (!input.email) {
    return
  }

  const allowedRoles = new Set(['owner', 'admin', 'operator', 'member', 'viewer'])
  const safeRole = allowedRoles.has(input.role) ? input.role : 'member'

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id: input.id,
        org_id: input.orgId,
        email: input.email,
        name: input.name,
        role: safeRole,
        password_hash: 'supabase_auth_managed',
        preferences: {},
        active: true,
      },
      { onConflict: 'id' },
    )

  if (error) {
    return
  }
}

// Helper to wrap route handlers with auth
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const auth = await requireAuth(req)
      return await handler(req, auth)
    } catch (err) {
      if (err instanceof NextResponse) return err
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
