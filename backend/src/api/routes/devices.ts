import { Router } from 'express'
import QRCode from 'qrcode'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../config/supabase.js'
import { whatsAppGateway } from '../../whatsapp/WhatsAppGateway.js'
import { DBAuthState } from '../../whatsapp/DBAuthState.js'
import { sendApiError } from '../http.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

const createDeviceSchema = z.object({
  name: z.string().min(1).max(120),
})

async function loadDevice(deviceId: string, orgId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', deviceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

router.get('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('devices')
    .select('id, name, phone, status, last_seen, qr_code, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    sendApiError(response, 500, 'DEVICES_FETCH_FAILED', error.message)
    return
  }

  const { data: conversationRows, error: conversationError } = await supabase
    .from('conversations')
    .select('device_id')
    .eq('org_id', orgId)

  if (conversationError) {
    sendApiError(response, 500, 'DEVICES_FETCH_FAILED', conversationError.message)
    return
  }

  const conversationCountByDevice = new Map<string, number>()
  for (const row of conversationRows ?? []) {
    const deviceId = row.device_id
    if (!deviceId) {
      continue
    }

    conversationCountByDevice.set(deviceId, (conversationCountByDevice.get(deviceId) ?? 0) + 1)
  }

  response.json({
    success: true,
    data: (data ?? []).map((device) => {
      const runtime = whatsAppGateway.getRuntimeSnapshot(device.id)
      const status = whatsAppGateway.normalizeDeviceStatus(device.status, runtime?.status ?? null)

      return {
        ...device,
        status,
        runtimeStatus: runtime?.status ?? null,
        isLiveConnected: runtime?.connected ?? false,
        health: runtime?.health ?? whatsAppGateway.getTransportHealth(device.id),
        conversationCount: conversationCountByDevice.get(device.id) ?? 0,
      }
    }),
  })
})

router.post('/', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const parsed = createDeviceSchema.safeParse(request.body)
  if (!parsed.success) {
    sendApiError(response, 400, 'VALIDATION_FAILED', parsed.error.issues[0]?.message ?? 'Invalid device payload')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('devices')
    .insert({
      org_id: orgId,
      name: parsed.data.name.trim(),
      status: 'disconnected',
    })
    .select('*')
    .single()

  if (error) {
    sendApiError(response, 500, 'DEVICE_CREATE_FAILED', error.message)
    return
  }

  response.status(201).json({ success: true, data })
})

router.get('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  try {
    const data = await loadDevice(request.params.id, orgId)

    if (!data) {
      sendApiError(response, 404, 'DEVICE_NOT_FOUND', 'Device was not found')
      return
    }

    const runtime = whatsAppGateway.getRuntimeSnapshot(data.id)
    const status = whatsAppGateway.normalizeDeviceStatus(data.status, runtime?.status ?? null)

    response.json({
      success: true,
      data: {
        ...data,
        status,
        runtimeStatus: runtime?.status ?? null,
        isLiveConnected: runtime?.connected ?? false,
        health: runtime?.health ?? whatsAppGateway.getTransportHealth(data.id),
      },
    })
  } catch (error) {
    sendApiError(
      response,
      500,
      'DEVICE_FETCH_FAILED',
      error instanceof Error ? error.message : 'Failed to fetch device',
    )
  }
})

router.post('/:id/connect', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  try {
    const runtime = await whatsAppGateway.connectDevice(request.params.id, orgId, {
      forceFreshSession: true,
    })
    const data = await loadDevice(request.params.id, orgId)

    response.json({
      success: true,
      data: {
        ...data,
        runtimeStatus: runtime.status,
        isLiveConnected: runtime.connected,
        health: runtime.health,
      },
    })
  } catch (error) {
    sendApiError(
      response,
      500,
      'DEVICE_CONNECT_FAILED',
      error instanceof Error ? error.message : 'Failed to connect device',
    )
  }
})

router.post('/:id/disconnect', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  try {
    const runtime = await whatsAppGateway.disconnectDevice(request.params.id, orgId)
    const data = await loadDevice(request.params.id, orgId)

    response.json({
      success: true,
      data: {
        ...data,
        runtimeStatus: runtime.status,
        isLiveConnected: runtime.connected,
        health: runtime.health,
      },
    })
  } catch (error) {
    sendApiError(
      response,
      500,
      'DEVICE_DISCONNECT_FAILED',
      error instanceof Error ? error.message : 'Failed to disconnect device',
    )
  }
})

router.delete('/:id', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const deviceId = request.params.id

  try {
    const existing = await loadDevice(deviceId, orgId)
    if (!existing) {
      sendApiError(response, 404, 'DEVICE_NOT_FOUND', 'Device was not found')
      return
    }

    // Best effort runtime/session cleanup before deleting persistent record.
    await whatsAppGateway.disconnectDevice(deviceId, orgId).catch(() => undefined)
    const authStore = new DBAuthState(deviceId, orgId)
    await authStore.clear().catch(() => undefined)

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId)
      .eq('org_id', orgId)

    if (error) {
      sendApiError(response, 500, 'DEVICE_DELETE_FAILED', error.message)
      return
    }

    response.json({
      success: true,
      data: {
        id: deviceId,
      },
    })
  } catch (error) {
    sendApiError(
      response,
      500,
      'DEVICE_DELETE_FAILED',
      error instanceof Error ? error.message : 'Failed to delete device',
    )
  }
})

router.get('/:id/qr', async (request: AuthenticatedRequest, response) => {
  const orgId = request.orgId
  if (!orgId) {
    sendApiError(response, 403, 'ORG_SCOPE_REQUIRED', 'Organization scope is required')
    return
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('devices')
    .select('id, status, qr_code, updated_at')
    .eq('org_id', orgId)
    .eq('id', request.params.id)
    .maybeSingle()

  if (error) {
    sendApiError(response, 500, 'DEVICE_QR_FAILED', error.message)
    return
  }

  const runtime = whatsAppGateway.getRuntimeSnapshot(request.params.id)
  const status = whatsAppGateway.normalizeDeviceStatus(
    (data?.status ?? 'disconnected') as 'connected' | 'disconnected' | 'connecting',
    runtime?.status ?? null,
  )
  const qr = status === 'connected' ? null : data?.qr_code ?? null
  const qrImage = qr ? await QRCode.toDataURL(qr, { margin: 1, width: 280 }) : null

  response.json({
    success: true,
    data: {
      id: data?.id ?? request.params.id,
      status,
      qr,
      qrImage,
      updatedAt: data?.updated_at ?? null,
      runtimeStatus: runtime?.status ?? null,
      isLiveConnected: runtime?.connected ?? false,
      health: runtime?.health ?? whatsAppGateway.getTransportHealth(request.params.id),
    },
  })
})

export default router
