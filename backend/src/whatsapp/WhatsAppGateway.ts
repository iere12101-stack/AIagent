import { EventEmitter } from 'node:events'
import type { ConnectionState, WAMessage } from '@whiskeysockets/baileys'
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js'
import { BaileysManager, type SendTextResult } from './BaileysManager.js'
import { DBAuthState } from './DBAuthState.js'
import { MessageRouter } from './MessageRouter.js'
import { COMPANY } from '../config/companyData.js'

function extractPropertyRefs(text: string): string[] {
  const refs: string[] = []
  const patterns = [
    /\bRef:\s*([A-Za-z0-9/_-]{2,})\b/g,
    /\b🏷\s*Ref:\s*([A-Za-z0-9/_-]{2,})\b/g,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(text)) !== null) {
      const ref = (match[1] ?? '').trim()
      if (ref && !refs.includes(ref)) refs.push(ref)
    }
  }
  return refs
}

function isPropertyLikeMessage(text: string): boolean {
  return (
    /\*Property\s*\d+\*/i.test(text) ||
    /Starting from AED/i.test(text) ||
    /\bAED\s*[\d,]+\b/i.test(text) ||
    /━━━━━━━━━━━━━━━━━━/.test(text) ||
    /\bRef:\s*[A-Za-z0-9/_-]{2,}\b/i.test(text)
  )
}

function enforceCompanyDomain(text: string): string {
  const t = text
    .replace(/\bieredubai\.com\b/gi, COMPANY.website.replace(/^https?:\/\//, ''))
    .replace(/\bwww\.ieredubai\.com\b/gi, COMPANY.website.replace(/^https?:\/\//, ''))
    .replace(/\biere\.ae\b/gi, 'investmentexperts.ae')
    .replace(/\bwww\.iere\.ae\b/gi, 'investmentexperts.ae')
    .replace(/\biererealestate\.com\b/gi, 'investmentexperts.ae')
    .replace(/\bwww\.iererealestate\.com\b/gi, 'investmentexperts.ae')
    .replace(/\biererealestate\.ae\b/gi, 'investmentexperts.ae')
    .replace(/\bwww\.iererealestate\.ae\b/gi, 'investmentexperts.ae')
  return t
}

interface DeviceRecord {
  id: string
  org_id: string
  status: 'connected' | 'disconnected' | 'connecting'
  qr_code?: string | null
  updated_at?: string | null
}

interface ManagedDeviceSession {
  deviceId: string
  orgId: string
  manager: BaileysManager
}

export interface DeviceRuntimeSnapshot {
  deviceId: string
  orgId: string
  status: string
  connected: boolean
  health: DeviceTransportHealth
}

export interface OutboundTextInput {
  orgId: string
  phone?: string
  jid?: string
  text: string
  deviceId?: string | null
}

export interface OutboundTextResult extends SendTextResult {
  deviceId: string
}

export interface DeviceTransportHealth {
  deviceId: string
  orgId: string
  state: 'healthy' | 'connecting' | 'unhealthy'
  lastEvent: 'connected' | 'reconnecting' | 'replaced' | 'disconnected' | 'send_succeeded' | 'send_failed' | 'send_blocked'
  lastDetail: string | null
  lastConnectedAt: string | null
  lastErrorAt: string | null
  consecutiveConflicts: number
  consecutiveSendFailures: number
  suggestedAction: string | null
}

interface ConnectDeviceOptions {
  forceFreshSession?: boolean
}

type GatewayEvents = {
  qr: {
    deviceId: string
    orgId: string
    qr: string
  }
  connection: {
    deviceId: string
    orgId: string
    state: ConnectionState
  }
  message: {
    deviceId: string
    orgId: string
    message: WAMessage
  }
}

export class WhatsAppGateway {
  private readonly supabase = isSupabaseConfigured() ? getSupabaseAdmin() : null
  private readonly messageRouter = new MessageRouter()
  private readonly events = new EventEmitter()
  private readonly sessions = new Map<string, ManagedDeviceSession>()
  private readonly connectPromises = new Map<string, Promise<ManagedDeviceSession>>()
  private readonly transportHealth = new Map<string, DeviceTransportHealth>()
  private bootstrapped = false

  async bootstrap(): Promise<void> {
    if (this.bootstrapped || !this.supabase) {
      this.bootstrapped = true
      return
    }
    const supabase = this.supabase

    const { data, error } = await supabase
      .from('devices')
      .select('id, org_id, status')
      .in('status', ['connected', 'connecting'])

    if (error) {
      console.error('Failed to bootstrap WhatsApp devices:', error)
      return
    }

    this.bootstrapped = true

    const staleConnecting = (data ?? []).filter((row) => row.status === 'connecting')
    if (staleConnecting.length > 0) {
      await Promise.all(
        staleConnecting.map(async (device) => {
          await supabase
            .from('devices')
            .update({
              status: 'disconnected',
              qr_code: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', device.id)
            .eq('org_id', device.org_id)
        }),
      )
    }

    const devicesToRestore = (data ?? []).filter((row) => row.status === 'connected')

    await Promise.all(
      devicesToRestore.map(async (device) => {
        const typedDevice = device as DeviceRecord
        try {
          await this.connectDevice(typedDevice.id, typedDevice.org_id)
        } catch (bootstrapError) {
          console.error(`Failed to restore device ${typedDevice.id}:`, bootstrapError)
        }
      }),
    )
  }

  async connectDevice(
    deviceId: string,
    orgId: string,
    options: ConnectDeviceOptions = {},
  ): Promise<DeviceRuntimeSnapshot> {
    const device = await this.loadDevice(deviceId, orgId)
    if (!device) {
      throw new Error('Device was not found for this organization')
    }

    if (options.forceFreshSession) {
      await this.resetDeviceSession(deviceId, orgId)
    }

    const existing = this.sessions.get(deviceId)
    if (existing) {
      if (existing.manager.isConnected()) {
        return this.buildSnapshot(existing)
      }

      await existing.manager.reconnect()
      return this.buildSnapshot(existing)
    }

    const pendingConnection = this.connectPromises.get(deviceId)
    if (pendingConnection) {
      const session = await pendingConnection
      return this.buildSnapshot(session)
    }

    const connection = this.createSession(device)
      .then(async (session) => {
        await session.manager.connect()
        this.sessions.set(device.id, session)
        return session
      })
      .finally(() => {
        this.connectPromises.delete(deviceId)
      })

    this.connectPromises.set(deviceId, connection)
    const session = await connection

    return this.buildSnapshot(session)
  }

  async disconnectDevice(deviceId: string, orgId: string): Promise<DeviceRuntimeSnapshot> {
    const device = await this.loadDevice(deviceId, orgId)
    if (!device) {
      throw new Error('Device was not found for this organization')
    }

    const session = this.sessions.get(deviceId)
    if (session) {
      await session.manager.disconnect()
      this.sessions.delete(deviceId)
    } else if (this.supabase) {
      await this.supabase
        .from('devices')
        .update({
          status: 'disconnected',
          qr_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviceId)
        .eq('org_id', orgId)
    }

    return {
      deviceId,
      orgId,
      status: 'closed',
      connected: false,
      health: this.ensureTransportHealth(deviceId, orgId),
    }
  }

  getRuntimeSnapshot(deviceId: string): DeviceRuntimeSnapshot | null {
    const session = this.sessions.get(deviceId)
    return session ? this.buildSnapshot(session) : null
  }

  getTransportHealth(deviceId: string): DeviceTransportHealth | null {
    return this.transportHealth.get(deviceId) ?? null
  }

  getTransportHealthSummary(): {
    trackedDevices: number
    healthyDevices: number
    connectingDevices: number
    unhealthyDevices: number
    replacedConflicts: number
    sendFailures: number
    alerts: string[]
  } {
    const healthRows = Array.from(this.transportHealth.values())
    const alerts = healthRows
      .filter((row) => row.state !== 'healthy' || row.lastEvent === 'replaced')
      .map((row) => `${row.deviceId}: ${row.lastDetail ?? row.lastEvent}`)
      .slice(0, 5)

    return {
      trackedDevices: healthRows.length,
      healthyDevices: healthRows.filter((row) => row.state === 'healthy').length,
      connectingDevices: healthRows.filter((row) => row.state === 'connecting').length,
      unhealthyDevices: healthRows.filter((row) => row.state === 'unhealthy').length,
      replacedConflicts: healthRows.filter((row) => row.lastEvent === 'replaced').length,
      sendFailures: healthRows.reduce((total, row) => total + row.consecutiveSendFailures, 0),
      alerts,
    }
  }

  getConnectedDeviceIds(): string[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.manager.isConnected())
      .map((session) => session.deviceId)
      .sort()
  }

  getRuntimeSnapshotSummary(): {
    trackedDevices: number
    connectedDeviceIds: string[]
    healthyDevices: number
    connectingDevices: number
    unhealthyDevices: number
    replacedConflicts: number
    sendFailures: number
    alerts: string[]
  } {
    return {
      ...this.getTransportHealthSummary(),
      connectedDeviceIds: this.getConnectedDeviceIds(),
    }
  }

  normalizeDeviceStatus(
    storedStatus: DeviceRecord['status'],
    runtimeStatus: string | null,
  ): DeviceRecord['status'] {
    if (!runtimeStatus) {
      return storedStatus
    }

    if (runtimeStatus === 'open') {
      return 'connected'
    }

    if (runtimeStatus === 'qr' || runtimeStatus === 'connecting' || runtimeStatus === 'idle') {
      return 'connecting'
    }

    if (runtimeStatus === 'closed') {
      return 'disconnected'
    }

    return storedStatus
  }

  async sendText(input: OutboundTextInput): Promise<OutboundTextResult> {
    const resolved = await this.resolveOutboundSession(input.orgId, input.deviceId ?? null)
    const jid = this.resolveJid(input)
    if (!resolved.manager.isConnected()) {
      this.recordTransportEvent(resolved.deviceId, input.orgId, {
        kind: 'send_blocked',
        detail: 'Outbound send blocked because the WhatsApp session is not connected',
      })
      throw new Error('WhatsApp device is not connected. Reconnect or re-pair the bot before sending.')
    }

    try {
      let outboundText = enforceCompanyDomain(input.text)

      // Transport-level anti-hallucination: verify property refs exist in DB.
      if (this.supabase && isPropertyLikeMessage(outboundText)) {
        const refs = extractPropertyRefs(outboundText)
        if (refs.length > 0) {
          const { data, error } = await this.supabase
            .from('properties')
            .select('ref_number')
            .eq('org_id', input.orgId)
            .in('ref_number', refs)

          const foundRefs = new Set(
            (data ?? [])
              .map((row: { ref_number?: string | null }) => row.ref_number)
              .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
          )

          const missing = refs.filter((r) => !foundRefs.has(r))
          if (error || missing.length > 0) {
            console.error('[OUTBOUND_REF_GUARD] Blocking unverified property refs', {
              orgId: input.orgId,
              refs,
              missing,
              error: error?.message ?? null,
            })
            outboundText =
              "I couldn't verify those listings in our database right now. Let me connect you with our sales team to assist you immediately."
          }
        }
      }

      if (!outboundText.trim()) {
        outboundText = "I'm here to help — could you please re-send your request?"
      }

      const result = await resolved.manager.sendText(jid, outboundText)
      this.recordTransportEvent(resolved.deviceId, input.orgId, {
        kind: 'send_succeeded',
      })

      console.info(`[WHATSAPP][SEND_OK] device=${resolved.deviceId} jid=${jid}`)

      return {
        deviceId: resolved.deviceId,
        messageId: result.messageId,
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown outbound send error'
      this.recordTransportEvent(resolved.deviceId, input.orgId, {
        kind: 'send_failed',
        detail,
      })
      console.error(`[WHATSAPP][SEND_FAILED] device=${resolved.deviceId} jid=${jid}: ${detail}`)
      throw error
    }
  }

  on<EventName extends keyof GatewayEvents>(
    eventName: EventName,
    listener: (payload: GatewayEvents[EventName]) => void,
  ): () => void {
    this.events.on(eventName, listener)
    return () => {
      this.events.off(eventName, listener)
    }
  }

  async shutdown(): Promise<void> {
    const activeSessions = Array.from(this.sessions.values())
    await Promise.all(
      activeSessions.map(async (session) => {
        try {
          await session.manager.disconnect()
        } catch (error) {
          console.error(`Failed to disconnect device ${session.deviceId}:`, error)
        }
      }),
    )

    this.sessions.clear()
    this.connectPromises.clear()
  }

  private async resolveOutboundSession(
    orgId: string,
    preferredDeviceId: string | null,
  ): Promise<ManagedDeviceSession> {
    if (preferredDeviceId) {
      const preferredSession = await this.ensureConnectedSession(preferredDeviceId, orgId)
      if (preferredSession.manager.isConnected()) {
        return preferredSession
      }
    }

    const connectedInMemory = Array.from(this.sessions.values()).find(
      (session) => session.orgId === orgId && session.manager.isConnected(),
    )
    if (connectedInMemory) {
      return connectedInMemory
    }

    if (!this.supabase) {
      throw new Error('Supabase is not configured')
    }

    const { data, error } = await this.supabase
      .from('devices')
      .select('id, org_id, status')
      .eq('org_id', orgId)
      .in('status', ['connected', 'connecting'])
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      const device = row as DeviceRecord
      const session = await this.ensureConnectedSession(device.id, orgId)
      if (session.manager.isConnected()) {
        return session
      }
    }

    throw new Error('No connected WhatsApp device is available for this organization')
  }

  private async ensureConnectedSession(deviceId: string, orgId: string): Promise<ManagedDeviceSession> {
    const existing = this.sessions.get(deviceId)
    if (existing) {
      await existing.manager.connect()
      await existing.manager.waitForConnection().catch(() => undefined)
      return existing
    }

    await this.connectDevice(deviceId, orgId)

    const session = this.sessions.get(deviceId)
    if (!session) {
      throw new Error('Device session failed to initialize')
    }

    await session.manager.waitForConnection().catch(() => undefined)

    return session
  }

  private async loadDevice(deviceId: string, orgId: string): Promise<DeviceRecord | null> {
    if (!this.supabase) {
      return null
    }

    const { data, error } = await this.supabase
      .from('devices')
      .select('id, org_id, status, qr_code, updated_at')
      .eq('id', deviceId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data as DeviceRecord | null) ?? null
  }

  private async createSession(device: DeviceRecord): Promise<ManagedDeviceSession> {
    const session: ManagedDeviceSession = {
      deviceId: device.id,
      orgId: device.org_id,
      manager: new BaileysManager({
        deviceId: device.id,
        orgId: device.org_id,
        onQR: (qr) => {
          this.events.emit('qr', {
            deviceId: device.id,
            orgId: device.org_id,
            qr,
          } satisfies GatewayEvents['qr'])
        },
        onConnectionUpdate: (state) => {
          this.events.emit('connection', {
            deviceId: device.id,
            orgId: device.org_id,
            state,
          } satisfies GatewayEvents['connection'])
        },
        onTransportEvent: (event) => {
          this.recordTransportEvent(device.id, device.org_id, event)
        },
        onMessages: (messages) => {
          for (const message of messages) {
            this.events.emit('message', {
              deviceId: device.id,
              orgId: device.org_id,
              message,
            } satisfies GatewayEvents['message'])

            void this.messageRouter.routeMessage(device.id, device.org_id, message).catch((error) => {
              console.error(`Failed to route inbound message for device ${device.id}:`, error)
            })
          }
        },
      }),
    }

    return session
  }

  private async resetDeviceSession(deviceId: string, orgId: string): Promise<void> {
    const existing = this.sessions.get(deviceId)
    if (existing) {
      await existing.manager.disconnect().catch(() => undefined)
      this.sessions.delete(deviceId)
    }

    this.connectPromises.delete(deviceId)

    if (this.supabase) {
      await this.supabase
        .from('devices')
        .update({
          status: 'connecting',
          qr_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviceId)
        .eq('org_id', orgId)
        .throwOnError()
    }

    const authStore = new DBAuthState(deviceId, orgId)
    await authStore.clear().catch(() => undefined)
  }

  private buildSnapshot(session: ManagedDeviceSession): DeviceRuntimeSnapshot {
    return {
      deviceId: session.deviceId,
      orgId: session.orgId,
      status: session.manager.getConnectionState(),
      connected: session.manager.isConnected(),
      health: this.ensureTransportHealth(session.deviceId, session.orgId),
    }
  }

  private ensureTransportHealth(deviceId: string, orgId: string): DeviceTransportHealth {
    const existing = this.transportHealth.get(deviceId)
    if (existing) {
      return existing
    }

    const initial: DeviceTransportHealth = {
      deviceId,
      orgId,
      state: 'connecting',
      lastEvent: 'disconnected',
      lastDetail: 'Waiting for WhatsApp session to connect',
      lastConnectedAt: null,
      lastErrorAt: null,
      consecutiveConflicts: 0,
      consecutiveSendFailures: 0,
      suggestedAction: 'Open the Devices page and connect or re-pair this WhatsApp number.',
    }
    this.transportHealth.set(deviceId, initial)
    return initial
  }

  private recordTransportEvent(
    deviceId: string,
    orgId: string,
    event: {
      kind: 'connected' | 'reconnecting' | 'replaced' | 'disconnected' | 'send_succeeded' | 'send_failed' | 'send_blocked'
      detail?: string
    },
  ): void {
    const current = this.ensureTransportHealth(deviceId, orgId)
    const now = new Date().toISOString()
    let next: DeviceTransportHealth = {
      ...current,
      lastEvent: event.kind,
      lastDetail: event.detail ?? null,
    }

    if (event.kind === 'connected' || event.kind === 'send_succeeded') {
      next = {
        ...next,
        state: 'healthy',
        lastConnectedAt: event.kind === 'connected' ? now : current.lastConnectedAt,
        consecutiveSendFailures: event.kind === 'send_succeeded' ? 0 : current.consecutiveSendFailures,
        consecutiveConflicts: event.kind === 'connected' ? 0 : current.consecutiveConflicts,
        lastErrorAt: event.kind === 'connected' ? current.lastErrorAt : current.lastErrorAt,
        suggestedAction: null,
      }
    } else if (event.kind === 'reconnecting') {
      next = {
        ...next,
        state: 'connecting',
        lastErrorAt: now,
        suggestedAction: 'The bot is reconnecting. Wait a moment before retrying outbound messages.',
      }
    } else if (event.kind === 'replaced') {
      next = {
        ...next,
        state: 'unhealthy',
        lastErrorAt: now,
        consecutiveConflicts: current.consecutiveConflicts + 1,
        suggestedAction: 'Close all other WhatsApp Web/Desktop sessions for this number, then re-pair the SaaS bot.',
      }
    } else if (event.kind === 'send_failed' || event.kind === 'send_blocked') {
      next = {
        ...next,
        state: 'unhealthy',
        lastErrorAt: now,
        consecutiveSendFailures: current.consecutiveSendFailures + 1,
        suggestedAction: 'Reconnect or re-pair the WhatsApp device before sending more replies.',
      }
    } else if (event.kind === 'disconnected') {
      next = {
        ...next,
        state: 'unhealthy',
        lastErrorAt: now,
        suggestedAction: 'Reconnect the WhatsApp device from the Devices page.',
      }
    }

    this.transportHealth.set(deviceId, next)

    if (event.kind === 'connected') {
      console.info(`[WHATSAPP][STATE] device=${deviceId} connected`)
    } else if (event.kind === 'reconnecting') {
      console.warn(`[WHATSAPP][STATE] device=${deviceId} reconnecting: ${event.detail ?? 'unknown'}`)
    } else if (event.kind === 'replaced') {
      console.error(`[WHATSAPP][STATE] device=${deviceId} replaced: ${event.detail ?? 'session conflict'}`)
    } else if (event.kind === 'disconnected') {
      console.warn(`[WHATSAPP][STATE] device=${deviceId} disconnected: ${event.detail ?? 'unknown'}`)
    }
  }

  private resolveJid(input: OutboundTextInput): string {
    if (typeof input.jid === 'string' && input.jid.includes('@')) {
      return input.jid.trim()
    }

    if (typeof input.phone !== 'string' || input.phone.trim().length === 0) {
      throw new Error('Phone number or WhatsApp JID is required')
    }

    return this.toWhatsAppJid(input.phone)
  }

  private toWhatsAppJid(phone: string): string {
    if (phone.includes('@')) {
      return phone.trim()
    }

    const digits = phone.replace(/\D/g, '')
    if (!digits) {
      throw new Error('Phone number is missing or invalid')
    }

    return `${digits}@s.whatsapp.net`
  }
}

export const whatsAppGateway = new WhatsAppGateway()
