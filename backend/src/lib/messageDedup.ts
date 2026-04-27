// Baileys fires messages.upsert 2-3x for one WhatsApp message.
// This file blocks duplicate processing and queues concurrent messages.

const processedIds = new Map<string, number>()
const DEDUP_TTL = 5 * 60 * 1000

setInterval(() => {
  const cutoff = Date.now() - DEDUP_TTL
  for (const [id, ts] of processedIds) {
    if (ts < cutoff) processedIds.delete(id)
  }
}, DEDUP_TTL)

export function isAlreadyProcessed(msgId: string): boolean {
  const ts = processedIds.get(msgId)
  if (ts) {
    processedIds.set(msgId, Date.now())
    return true
  }
  return false
}

export function markProcessed(msgId: string): void {
  processedIds.set(msgId, Date.now())
}

const locks = new Map<string, boolean>()
const queues = new Map<string, Array<() => void>>()

export function acquireLock(phone: string): Promise<() => void> {
  return new Promise((resolve) => {
    const tryGet = () => {
      if (!locks.get(phone)) {
        locks.set(phone, true)
        const timer = setTimeout(() => release(phone), 30_000)
        resolve(() => {
          clearTimeout(timer)
          release(phone)
        })
      } else {
        const q = queues.get(phone) ?? []
        q.push(tryGet)
        queues.set(phone, q)
      }
    }
    tryGet()
  })
}

function release(phone: string): void {
  locks.delete(phone)
  const q = queues.get(phone) ?? []
  if (q.length > 0) {
    const next = q.shift()!
    queues.set(phone, q)
    setTimeout(next, 50)
  } else {
    queues.delete(phone)
  }
}
