import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function shouldUseSecureCookies(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }

  return request.nextUrl.protocol === 'https:'
}

async function ensureUserMapping(input: {
  userId: string
  email: string | null
  name: string | null
}): Promise<void> {
  if (!input.email) {
    return
  }

  const supabase = createServerClient()
  const { data: userById } = await supabase
    .from('users')
    .select('id')
    .eq('id', input.userId)
    .maybeSingle()

  if (userById) {
    return
  }

  const { data: userByEmail } = await supabase
    .from('users')
    .select('id')
    .eq('email', input.email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (userByEmail) {
    return
  }

  const { data: firstOrg } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!firstOrg) {
    return
  }

  const { error } = await supabase
    .from('users')
    .insert({
      id: input.userId,
      org_id: firstOrg.id,
      email: input.email,
      name: input.name?.trim() || input.email.split('@')[0] || 'User',
      role: 'member',
      password_hash: 'supabase_auth_managed',
      preferences: {},
      active: true,
    })

  if (error) {
    return
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase auth is not configured' }, { status: 503 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await authClient.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    try {
      await ensureUserMapping({
        userId: data.user.id,
        email: data.user.email ?? null,
        name: (data.user.user_metadata?.name as string | undefined) ?? null,
      })
    } catch (mappingError) {
      console.error('Auth user mapping warning:', mappingError)
    }

    const response = NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
    })

    const cookieOptions = {
      httpOnly: true,
      secure: shouldUseSecureCookies(request),
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    }

    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    response.cookies.set('sb-access-token', data.session.access_token, cookieOptions)
    response.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions)

    return response
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json(
      {
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 },
    )
  }
}
