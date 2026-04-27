type ReconnectHandler = () => Promise<void>

export class SelfHeal {
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private maxAttempts = 10

  constructor(
    private readonly reconnect: ReconnectHandler,
    private readonly baseDelayMs: number = 5_000, // Increased from 2_000
    private readonly maxDelayMs: number = 300_000, // Increased from 60_000 (5 minutes)
  ) {}

  schedule(): void {
    if (this.timer) {
      return
    }

    if (this.attempts >= this.maxAttempts) {
      console.error(`SelfHeal: Maximum retry attempts (${this.maxAttempts}) reached. Giving up.`)
      return
    }

    const delay = Math.min(this.baseDelayMs * Math.pow(1.5, this.attempts), this.maxDelayMs)
    this.attempts += 1

    console.log(`SelfHeal: Scheduling reconnect attempt ${this.attempts} in ${delay}ms`)

    this.timer = setTimeout(() => {
      this.timer = null
      void this.reconnect().catch((error) => {
        console.error(`SelfHeal: Reconnect attempt ${this.attempts} failed:`, error)
        this.schedule() // Schedule next attempt
      })
    }, delay)
  }

  reset(): void {
    this.attempts = 0
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  stop(): void {
    this.reset()
  }

  getAttempts(): number {
    return this.attempts
  }
}
