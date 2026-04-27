/**
 * In-memory message lock to prevent duplicate processing.
 * Acquires a per-message processing lock.
 * Returns true if lock acquired (safe to process).
 * Returns false if already processing (duplicate — drop this message).
 */

const activeLocks = new Map<string, { timestamp: number }>()
const LOCK_TTL_MS = 30 * 1000 // 30 seconds

// Cleanup stale locks periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of activeLocks.entries()) {
    if (now - value.timestamp > LOCK_TTL_MS) {
      activeLocks.delete(key)
    }
  }
}, 10 * 1000) // Every 10 seconds

export async function acquireMessageLock(
  messageId: string,
  ttlSeconds = 30
): Promise<boolean> {
  const key = `msg_lock:${messageId}`
  
  if (activeLocks.has(key)) {
    return false // Already locked
  }

  activeLocks.set(key, { timestamp: Date.now() })
  return true
}

export async function releaseMessageLock(messageId: string): Promise<void> {
  const key = `msg_lock:${messageId}`
  activeLocks.delete(key)
}
