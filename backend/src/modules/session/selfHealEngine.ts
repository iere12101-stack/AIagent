import { getSupabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js'

type DeviceHealthRegistration = {
  orgId: string
  reconnect: () => Promise<void>
  getSocketState: () => number | null | undefined
}

const reconnectAttempts = new Map<string, number>()
const reconnectTimers = new Map<string, NodeJS.Timeout>()
const devices = new Map<string, DeviceHealthRegistration>()

const MAX_RETRIES = 10
const BASE_DELAY_MS = 5_000
const MAX_DELAY_MS = 300_000
const HEALTH_CHECK_INTERVAL_MS = 60_000

function getDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS)
}

async function updateDevice(
  deviceId: string,
  orgId: string,
  values: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  await getSupabaseAdmin()
    .from('devices')
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId)
    .eq('org_id', orgId)
    .throwOnError()
}

export class SelfHealEngine {
  private static monitorStarted = false

  registerDevice(
    deviceId: string,
    orgId: string,
    registration: Omit<DeviceHealthRegistration, 'orgId'>,
  ): void {
    devices.set(deviceId, {
      orgId,
      ...registration,
    })
  }

  unregisterDevice(deviceId: string): void {
    devices.delete(deviceId)
    reconnectAttempts.delete(deviceId)
    const existing = reconnectTimers.get(deviceId)
    if (existing) {
      clearTimeout(existing)
      reconnectTimers.delete(deviceId)
    }
  }

  onDisconnect(deviceId: string, orgId: string, reason?: string): void {
    const registration = devices.get(deviceId)
    if (!registration) {
      console.warn(`[SELFHEAL] Missing registration for disconnected device ${deviceId}`)
      return
    }

    const wsState = registration.getSocketState()
    if (wsState === 0 || wsState === 1) {
      return
    }

    const existing = reconnectTimers.get(deviceId)
    if (existing) {
      return
    }

    const attempt = (reconnectAttempts.get(deviceId) ?? 0) + 1
    reconnectAttempts.set(deviceId, attempt)

    if (attempt > MAX_RETRIES) {
      console.error(`[SELFHEAL] Max retries reached for ${deviceId} — marking offline`)
      void updateDevice(deviceId, orgId, {
        status: 'disconnected',
        qr_code: null,
        last_seen: null,
      }).catch(() => undefined)
      reconnectAttempts.delete(deviceId)
      reconnectTimers.delete(deviceId)
      return
    }

    const delay = getDelay(attempt)
    console.warn(
      `[SELFHEAL] Device ${deviceId} disconnected (reason=${reason ?? 'unknown'}) — reconnecting in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
    )

    const timer = setTimeout(() => {
      void (async () => {
        try {
          await updateDevice(deviceId, orgId, {
            status: 'connecting',
          })
          await registration.reconnect()
          reconnectAttempts.delete(deviceId)
          reconnectTimers.delete(deviceId)
          console.info(`[SELFHEAL] Device ${deviceId} reconnected successfully`)
        } catch (error) {
          console.error(`[SELFHEAL] Reconnect failed for ${deviceId}:`, error)
          this.onDisconnect(deviceId, orgId, 'reconnect_failed')
        }
      })()
    }, delay)

    reconnectTimers.set(deviceId, timer)
  }

  onConnect(deviceId: string, orgId: string): void {
    reconnectAttempts.delete(deviceId)
    const existing = reconnectTimers.get(deviceId)
    if (existing) {
      clearTimeout(existing)
      reconnectTimers.delete(deviceId)
    }

    console.info(`[SELFHEAL] Device ${deviceId} connected — retry counter reset`)
    void updateDevice(deviceId, orgId, {
      status: 'connected',
      last_seen: new Date().toISOString(),
    }).catch(() => undefined)
  }

  startHealthMonitor(): void {
    if (SelfHealEngine.monitorStarted) {
      return
    }

    SelfHealEngine.monitorStarted = true
    setInterval(() => {
      void this.runHealthMonitor().catch((error) => {
        console.warn('[SELFHEAL] Health monitor error (non-fatal):', error)
      })
    }, HEALTH_CHECK_INTERVAL_MS)
  }

  private async runHealthMonitor(): Promise<void> {
    for (const [deviceId, registration] of devices.entries()) {
      const wsState = registration.getSocketState()
      const isAlive = wsState === 1
      if (!isAlive && !reconnectTimers.has(deviceId)) {
        console.warn(
          `[SELFHEAL] Health check detected dead socket for ${deviceId} (state=${wsState ?? 'missing'})`,
        )
        this.onDisconnect(deviceId, registration.orgId, 'health_check_dead')
      }
    }
  }
}

export const selfHealEngine = new SelfHealEngine()
