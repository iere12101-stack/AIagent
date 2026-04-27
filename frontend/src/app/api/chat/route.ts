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
  const backendResponse = await proxyBackendRequest(request, '/api/v1/chat', {
    method: 'POST',
    body: rawBody,
  })

  return backendResponse
}
