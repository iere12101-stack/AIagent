import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/authenticate'
import { proxyBackendRequest } from '@/lib/backend-api'
import { toCamelCase } from '@/lib/helpers'
import { createServerClient } from '@/lib/supabase'

const createDeviceSchema = z.object({
  name: z.string().min(1).max(120),
})

export async function GET(request: NextRequest) {
  const backendResponse = await proxyBackendRequest(request, '/api/v1/devices')
  if (backendResponse instanceof Response) {
    const payload = await backendResponse
      .json()
      .catch(() => ({ success: false, error: 'Invalid backend response' }))

    if (backendResponse.ok && payload?.success && Array.isArray(payload?.data)) {
      const normalizedData = payload.data.map((device: Record<string, unknown>) => {
        const { qr_code, ...rest } = device as Record<string, unknown>
        return toCamelCase(rest)
      })

      return NextResponse.json({ data: normalizedData })
    }

    if (backendResponse.status === 401 || backendResponse.status === 403) {
      return NextResponse.json(payload, { status: backendResponse.status })
    }
  }

  try {
    const auth = await requireAuth(request)
    const supabase = createServerClient()

    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch devices', details: error.message },
        { status: 500 },
      )
    }

    const { data: convoCounts } = await supabase
      .from('conversations')
      .select('device_id')
      .eq('org_id', auth.orgId)

    const deviceCountMap: Record<string, number> = {}
    if (convoCounts) {
      for (const conversation of convoCounts) {
        if (conversation.device_id) {
          deviceCountMap[conversation.device_id] = (deviceCountMap[conversation.device_id] || 0) + 1
        }
      }
    }

    const data = (devices || []).map((device) => {
      const { qr_code, ...rest } = device
      return {
        ...toCamelCase(rest),
        conversationCount: deviceCountMap[device.id] || 0,
      }
    })

    return NextResponse.json({ data, degraded: { backendRuntime: true } })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }

    return NextResponse.json(
      { error: 'Failed to fetch devices', details: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = createDeviceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const backendResponse = await proxyBackendRequest(request, '/api/v1/devices', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  })

  const payload = await backendResponse.json().catch(() => ({ error: 'Invalid backend response' }))
  return NextResponse.json(payload, { status: backendResponse.status })
}
