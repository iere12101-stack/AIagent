import { NextRequest, NextResponse } from 'next/server'
import { proxyBackendRequest } from '@/lib/backend-api'
import { requireAuth } from '@/lib/authenticate'

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
  } catch (error) {
    if (error instanceof NextResponse) return error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.text()
  return proxyBackendRequest(request, '/api/v1/messages', {
    method: 'POST',
    body: rawBody,
  })
}