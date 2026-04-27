import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type ConnectionState,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { getSupabaseAdmin } from '../config/supabase.js'
import { sanitize } from '../modules/ai/aiService.js'
import { selfHealEngine } from '../modules/session/selfHealEngine.js'
import { DBAuthState, useDBAuthState as createDbAuthState } from './DBAuthState.js'

export interface BaileysManagerConfig {
  deviceId: string
  orgId: string
  onQR?: (qr: string) => void
  onConnectionUpdate?: (state: ConnectionState) => void
  onMessages?: (messages: WAMessage[], type: string) => void
  onTransportEvent?: (event: {
    kind: 'connected' | 'reconnecting' | 'replaced' | 'disconnected'
    detail?: string
  }) => void
}

export interface SendTextResult {
  messageId: string | null
}

export class BaileysManager {
  private readonly supabase = getSupabaseAdmin()
  private socket: WASocket | null = null
  private status: 'idle' | 'connecting' | 'qr' | 'open' | 'closed' = 'idle'
  private intentionalClose = false

  constructor(private readonly config: BaileysManagerConfig) {
    selfHealEngine.registerDevice(this.config.deviceId, this.config.orgId, {
      reconnect: async () => {
        console.log(`SelfHeal: Attempting to reconnect device ${this.config.deviceId}`)
        await this.connect()
      },
      getSocketState: () => (this.socket?.ws as { readyState?: number } | undefined)?.readyState,
    })
    selfHealEngine.startHealthMonitor()
  }

  async connect(): Promise<WASocket> {
    if (this.socket && this.status !== 'closed') {
      return this.socket
    }

    if (this.socket && this.status === 'closed') {
      this.socket = null
    }

    const authStore = new DBAuthState(this.config.deviceId, this.config.orgId)
    const { state, saveCreds } = await createDbAuthState(authStore)
    const { version } = await fetchLatestBaileysVersion()

    this.status = 'connecting'
    await this.persistDeviceState('connecting')

    // Add timeout wrapper for socket creation
    const createSocketWithTimeout = (): Promise<WASocket> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket creation timed out after 30 seconds'))
        }, 30000) // 30 second timeout

        try {
          const socket = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: {
              creds: state.creds,
              keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            browser: ['IERE Bot', 'Chrome', '1.0.0'],
            // Add connection timeout options
            connectTimeoutMs: 20000,
            keepAliveIntervalMs: 10000,
            qrTimeout: 60000,
          })

          // Clear timeout on successful connection
          const clearTimeoutOnConnect = (update: any) => {
            if (update.connection === 'open' || update.connection === 'connecting') {
              clearTimeout(timeout)
              socket.ev.off('connection.update', clearTimeoutOnConnect)
            }
          }

          socket.ev.on('connection.update', clearTimeoutOnConnect)
          socket.ev.on('connection.update', (update) => {
            void this.handleConnectionUpdate(update, authStore)
          })
          socket.ev.on('creds.update', () => {
            void saveCreds()
          })
          socket.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify') {
              return
            }

            const inboundMessages = messages.filter((message) => !message?.key.fromMe && Boolean(message.message))
            if (inboundMessages.length > 0) {
              this.config.onMessages?.(inboundMessages, type)
            }
          })

          resolve(socket)
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
    }

    try {
      const socket = await createSocketWithTimeout()
      this.socket = socket
      return socket
    } catch (error) {
      console.error(`Failed to create WhatsApp socket for device ${this.config.deviceId}:`, error)
      this.status = 'closed'
      await this.persistDeviceState('disconnected')
      throw error
    }
  }

  async reconnect(): Promise<WASocket> {
    this.intentionalClose = true
    if (this.socket) {
      this.socket.end(new Error('Manual reconnect'))
      this.socket = null
    }

    this.status = 'closed'
    return this.connect()
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true
    if (this.socket) {
      this.socket.end(new Error('Manual disconnect'))
      this.socket = null
    }
    selfHealEngine.unregisterDevice(this.config.deviceId)
    this.status = 'closed'
    await this.persistDeviceState('disconnected')
  }

  async sendText(jid: string, text: string): Promise<SendTextResult> {
    if (!this.socket || !this.isConnected()) {
      throw new Error('WhatsApp socket is not connected')
    }

    // BUG 4 FIX: Sanitize all outbound messages to remove placeholder artifacts
    const safeText = sanitize(text)
    const result = await this.socket.sendMessage(jid, { text: safeText })

    return {
      messageId: result?.key?.id ?? null,
    }
  }

  getConnectionState(): string {
    return this.status
  }

  isConnected(): boolean {
    return this.status === 'open'
  }

  async waitForConnection(timeoutMs = 15_000): Promise<void> {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      if (this.isConnected()) {
        return
      }

      if (this.status === 'closed') {
        throw new Error('WhatsApp session is closed')
      }

      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    throw new Error(`WhatsApp session did not become ready within ${timeoutMs}ms`)
  }

  private async handleConnectionUpdate(
    update: Partial<ConnectionState>,
    authStore: DBAuthState,
  ): Promise<void> {
    this.config.onConnectionUpdate?.(update as ConnectionState)

    if (update.qr) {
      this.status = 'qr'
      this.config.onQR?.(update.qr)
      try {
        await this.persistDeviceState('connecting', update.qr)
      } catch (error) {
        console.error(`Failed to persist QR state for device ${this.config.deviceId}:`, error)
      }
    }

    if (update.connection === 'open') {
      this.status = 'open'
      this.intentionalClose = false
      this.config.onTransportEvent?.({ kind: 'connected' })
      selfHealEngine.onConnect(this.config.deviceId, this.config.orgId)
      try {
        await this.persistDeviceState('connected', undefined, this.extractConnectedPhone())
      } catch (error) {
        console.error(`Failed to persist connected state for device ${this.config.deviceId}:`, error)
      }
      return
    }

    if (update.connection === 'close') {
      this.socket = null
      this.status = 'closed'

      if (this.intentionalClose) {
        this.intentionalClose = false
        try {
          await this.persistDeviceState('disconnected')
        } catch (error) {
          console.error(`Failed to persist intentional disconnect for device ${this.config.deviceId}:`, error)
        }
        return
      }

      const statusCode = this.getDisconnectStatusCode(update.lastDisconnect?.error)
      const hasCorruptKeyError = this.containsCorruptKeyError(update.lastDisconnect?.error)
      const wasReplaced = this.containsReplacementConflict(update.lastDisconnect?.error)
      const reasonName =
        typeof statusCode === 'number'
          ? (DisconnectReason[statusCode] ?? `code:${statusCode}`)
          : 'unknown'
      console.warn(`WhatsApp disconnected for ${this.config.deviceId}. reason=${reasonName}`)

      if (wasReplaced) {
        this.config.onTransportEvent?.({
          kind: 'replaced',
          detail: 'Another WhatsApp Web/Desktop session replaced this bot session',
        })
        try {
          await this.persistDeviceState('disconnected')
        } catch (error) {
          console.error(`Failed to persist replaced-session state for device ${this.config.deviceId}:`, error)
        }
        console.error(
          `[WHATSAPP] Device ${this.config.deviceId} session was replaced by another WhatsApp session. Re-pair this bot after closing other Web/Desktop sessions.`,
        )
        return
      }

      const requiresFreshAuth =
        hasCorruptKeyError ||
        statusCode === DisconnectReason.loggedOut ||
        statusCode === DisconnectReason.badSession ||
        statusCode === DisconnectReason.multideviceMismatch ||
        statusCode === DisconnectReason.forbidden

      if (requiresFreshAuth) {
        this.config.onTransportEvent?.({
          kind: 'disconnected',
          detail: reasonName,
        })
        try {
          await authStore.clear()
        } catch (error) {
          console.error(`Failed to clear auth state for device ${this.config.deviceId}:`, error)
        }

        try {
          await this.persistDeviceState('connecting')
        } catch (error) {
          console.error(`Failed to persist reconnecting state for device ${this.config.deviceId}:`, error)
        }

        selfHealEngine.onDisconnect(this.config.deviceId, this.config.orgId, reasonName)
        return
      }

      const shouldReconnect =
        (!hasCorruptKeyError && statusCode == null) ||
        statusCode === DisconnectReason.restartRequired ||
        statusCode === DisconnectReason.connectionClosed ||
        statusCode === DisconnectReason.connectionLost ||
        statusCode === DisconnectReason.timedOut ||
        statusCode === DisconnectReason.unavailableService ||
        (update.lastDisconnect?.error as any)?.message?.includes('Timed Out') ||
        (update.lastDisconnect?.error as any)?.message?.includes('timeout')

      if (shouldReconnect) {
        this.config.onTransportEvent?.({
          kind: 'reconnecting',
          detail: reasonName,
        })
        console.log(`Scheduling reconnection for device ${this.config.deviceId} due to ${reasonName}`)
        try {
          await this.persistDeviceState('connecting')
        } catch (error) {
          console.error(`Failed to persist reconnecting state for device ${this.config.deviceId}:`, error)
        }
        selfHealEngine.onDisconnect(this.config.deviceId, this.config.orgId, reasonName)
        return
      }

      try {
        await this.persistDeviceState('disconnected')
      } catch (error) {
        console.error(`Failed to persist disconnected state for device ${this.config.deviceId}:`, error)
      }
      this.config.onTransportEvent?.({
        kind: 'disconnected',
        detail: reasonName,
      })
      selfHealEngine.onDisconnect(this.config.deviceId, this.config.orgId, reasonName)
    }
  }

  private getDisconnectStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null
    }

    const typedError = error as {
      output?: { statusCode?: number }
      statusCode?: number
      data?: { statusCode?: number }
    }

    return (
      typedError.output?.statusCode ??
      typedError.statusCode ??
      typedError.data?.statusCode ??
      null
    )
  }

  private containsCorruptKeyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const candidate = error as {
      message?: string
      data?: { message?: string }
      cause?: { message?: string }
    }

    const message = `${candidate.message ?? ''} ${candidate.data?.message ?? ''} ${candidate.cause?.message ?? ''}`
    return message.toLowerCase().includes('invalid private key type')
  }

  private containsReplacementConflict(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const candidate = error as {
      message?: string
      data?: { message?: string }
      output?: { payload?: { message?: string } }
      cause?: { message?: string }
    }

    const message = [
      candidate.message,
      candidate.data?.message,
      candidate.output?.payload?.message,
      candidate.cause?.message,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return message.includes('conflict') || message.includes('replaced')
  }

  private extractConnectedPhone(): string | null {
    const rawUserId = this.socket?.user?.id
    if (!rawUserId) {
      return null
    }

    const [phone] = rawUserId.split(':')
    return phone ? `+${phone.replace(/\D/g, '')}` : null
  }

  private async persistDeviceState(
    status: 'connected' | 'disconnected' | 'connecting',
    qrCode?: string,
    phone?: string | null,
  ): Promise<void> {
    await this.supabase
      .from('devices')
      .update({
        status,
        phone: phone ?? undefined,
        qr_code: qrCode ?? null,
        last_seen: status === 'connected' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.config.deviceId)
      .eq('org_id', this.config.orgId)
      .throwOnError()
  }
}
