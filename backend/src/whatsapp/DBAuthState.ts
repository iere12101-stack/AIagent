import {
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env } from '../config/env.js'
import { getSupabaseAdmin } from '../config/supabase.js'

function bufferReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return {
      type: 'Buffer',
      data: Array.from(value),
    }
  }

  return value
}

function bufferReviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'data' in value &&
    (value as { type?: string }).type === 'Buffer' &&
    Array.isArray((value as { data?: unknown[] }).data)
  ) {
    return Buffer.from((value as { data: number[] }).data)
  }

  return value
}

export class DBAuthState {
  private readonly supabase = getSupabaseAdmin()
  private readonly encryptionKey: Buffer

  constructor(
    private readonly deviceId: string,
    private readonly orgId: string,
  ) {
    if (!env.WA_SESSION_ENCRYPTION_KEY) {
      throw new Error('WA_SESSION_ENCRYPTION_KEY must be configured for Baileys session storage')
    }

    this.encryptionKey = Buffer.from(env.WA_SESSION_ENCRYPTION_KEY, 'hex')
  }

  async readData<T>(keyType: string, keyId: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from('baileys_sessions')
      .select('data')
      .eq('device_id', this.deviceId)
      .eq('org_id', this.orgId)
      .eq('key_type', keyType)
      .eq('key_id', keyId)
      .maybeSingle()

    if (error || !data?.data) {
      return null
    }

    return this.deserialize<T>(data.data)
  }

  async writeData(keyType: string, keyId: string, value: unknown): Promise<void> {
    const payload = this.serialize(value)
    const encrypted = this.encrypt(payload)

    const { error } = await this.supabase.from('baileys_sessions').upsert(
      {
        device_id: this.deviceId,
        org_id: this.orgId,
        key_type: keyType,
        key_id: keyId,
        data: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id,key_type,key_id' },
    )

    if (error) {
      throw error
    }
  }

  async removeData(keyType: string, keyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('baileys_sessions')
      .delete()
      .eq('device_id', this.deviceId)
      .eq('org_id', this.orgId)
      .eq('key_type', keyType)
      .eq('key_id', keyId)

    if (error) {
      throw error
    }
  }

  async clear(): Promise<void> {
    const { error } = await this.supabase
      .from('baileys_sessions')
      .delete()
      .eq('device_id', this.deviceId)
      .eq('org_id', this.orgId)

    if (error) {
      throw error
    }
  }

  async toAuthenticationState(): Promise<AuthenticationState> {
    const creds = (await this.readData<AuthenticationCreds>('creds', 'creds')) ?? initAuthCreds()

    return {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const values = {} as Record<string, SignalDataTypeMap[T]>
          for (const id of ids) {
            let value = await this.readData<SignalDataTypeMap[T]>(type, id)
            if (value && type === 'app-state-sync-key') {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as object) as unknown as SignalDataTypeMap[T]
            }
            if (value) {
              values[id] = value
            }
          }

          return values
        },
        set: async (data) => {
          const tasks: Promise<void>[] = []
          for (const [category, categoryEntries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(categoryEntries ?? {})) {
              if (value) {
                tasks.push(this.writeData(category, id, value))
              } else {
                tasks.push(this.removeData(category, id))
              }
            }
          }
          await Promise.all(tasks)
        },
      },
    }
  }

  private serialize(value: unknown): string {
    return JSON.stringify(value, bufferReplacer)
  }

  private deserialize<T>(value: string): T {
    return JSON.parse(this.decrypt(value), bufferReviver) as T
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  private decrypt(payload: string): string {
    const [ivHex, authTagHex, encryptedHex] = payload.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted Baileys session payload')
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    )
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }
}

export async function useDBAuthState(store: DBAuthState): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const state = await store.toAuthenticationState()
  return {
    state,
    saveCreds: async () => {
      await store.writeData('creds', 'creds', state.creds)
    },
  }
}
