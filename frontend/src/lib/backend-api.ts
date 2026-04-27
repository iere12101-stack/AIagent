import { NextRequest, NextResponse } from 'next/server'

function getBackendUrl(): string | null {
  const serverSideUrl = process.env.BACKEND_URL?.replace(/\/$/, '')
  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '')
  return publicUrl || serverSideUrl || null
}

export async function proxyBackendRequest(
  request: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<Response | NextResponse> {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return NextResponse.json(
      { error: 'Backend URL is not configured', code: 'BACKEND_URL_MISSING' },
      { status: 503 },
    )
  }

  const headers = new Headers(init?.headers)
  const cookie = request.headers.get('cookie')
  const authorization = request.headers.get('authorization')
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (cookie) {
    headers.set('cookie', cookie)
  }

  if (authorization) {
    headers.set('authorization', authorization)
  } else if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`)
  }

  if (!headers.has('content-type') && init?.body) {
    headers.set('content-type', 'application/json')
  }

  try {
    return await fetch(`${backendUrl}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Backend service is unavailable. Start backend with `npm run dev:backend`.',
        code: 'BACKEND_UNREACHABLE',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 503 },
    )
  }
}
