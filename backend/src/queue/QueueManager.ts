import { Queue, Worker, type Processor } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '../config/env.js'

export class QueueManager {
  private readonly connection =
    env.REDIS_HOST && env.REDIS_PORT
      ? new IORedis({
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          reconnectOnError: () => true,
          retryStrategy: (attempt) => Math.min(attempt * 1_000, 15_000),
        })
      : null

  createQueue<T>(name: string): Queue<T> | null {
    if (!this.connection) {
      return null
    }

    return new Queue<T>(name, { connection: this.connection })
  }

  createWorker<T>(name: string, processor: Processor<T>): Worker<T> | null {
    if (!this.connection) {
      return null
    }

    return new Worker<T>(name, processor, { connection: this.connection })
  }

  async shutdown(): Promise<void> {
    await this.connection?.quit()
  }
}
