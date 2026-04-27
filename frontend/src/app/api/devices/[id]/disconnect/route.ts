import { NextRequest, NextResponse } from 'next/server'
import { proxyBackendRequest } from '@/lib/backend-api'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const backendResponse = await proxyBackendRequest(request, `/api/v1/devices/${id}/disconnect`, {
    method: 'POST',
  })
  const payload = await backendResponse.json().catch(() => ({ error: 'Invalid backend response' }))
  return NextResponse.json(payload, { status: backendResponse.status })
}
