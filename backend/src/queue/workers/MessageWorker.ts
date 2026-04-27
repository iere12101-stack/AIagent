import type { Job } from 'bullmq'

export interface MessageWorkerJob {
  conversationId: string
  orgId: string
  content: string
}

export async function processMessageJob(job: Job<MessageWorkerJob>): Promise<void> {
  void job.data
}
