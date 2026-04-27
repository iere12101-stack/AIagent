import { NextRequest, NextResponse } from 'next/server'
import { proxyBackendRequest } from '@/lib/backend-api'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const response = await proxyBackendRequest(request, `/api/v1/contacts/${id}/property-matches`, {
    method: 'GET',
  })

  if (response instanceof NextResponse) {
    return response
  }

  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}
