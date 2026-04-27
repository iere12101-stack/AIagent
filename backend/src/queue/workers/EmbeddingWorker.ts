import type { Job } from 'bullmq'
import { KnowledgeIngestion } from '../../rag/KnowledgeIngestion.js'

export interface EmbeddingWorkerJob {
  knowledgeBaseId: string
  orgId: string
  fileName: string
  content: string
}

const ingestion = new KnowledgeIngestion()

export async function processEmbeddingJob(job: Job<EmbeddingWorkerJob>): Promise<void> {
  await ingestion.ingestText(job.data.orgId, job.data.knowledgeBaseId, job.data.fileName, job.data.content)
}
