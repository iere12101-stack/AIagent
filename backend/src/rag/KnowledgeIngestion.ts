import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '../config/supabase.js'
import { EmbeddingService } from './EmbeddingService.js'
import { HybridRAG } from './HybridRAG.js'

interface IngestedDocument {
  id: string
  filename: string
  type: string
  chunksCount: number
  status: 'processing' | 'completed' | 'failed'
  error?: string
}

export class KnowledgeIngestion {
  private readonly supabase
  private readonly hybridRAG: HybridRAG

  constructor() {
    this.supabase = getSupabaseAdmin()
    this.hybridRAG = new HybridRAG()
  }

  async ingestDocument(filePath: string, knowledgeBaseId: string, orgId: string): Promise<IngestedDocument> {
    const filename = path.basename(filePath)
    const fileExt = path.extname(filePath).toLowerCase()

    try {
      const text = await this.extractText(filePath, fileExt)
      if (!text.trim()) {
        throw new Error('No text content extracted from document')
      }

      const chunks = this.chunkText(text)
      const result = await this.processChunks(chunks, knowledgeBaseId, orgId, filename)

      return {
        id: result.documentId,
        filename,
        type: fileExt,
        chunksCount: chunks.length,
        status: 'completed',
      }
    } catch (error) {
      return {
        id: '',
        filename,
        type: fileExt,
        chunksCount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown ingestion error',
      }
    }
  }

  async deleteDocument(documentId: string, knowledgeBaseId: string, orgId: string): Promise<void> {
    const { data: chunks, error } = await this.supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('org_id', orgId)
      .eq('metadata->>document_id', documentId)

    if (error) {
      throw error
    }

    const ids = (chunks ?? []).map((chunk) => chunk.id)
    if (ids.length === 0) {
      return
    }

    const { error: deleteError } = await this.supabase.from('knowledge_chunks').delete().in('id', ids)
    if (deleteError) {
      throw deleteError
    }
  }

  async getDocumentStats(knowledgeBaseId: string, orgId: string): Promise<{
    totalChunks: number
    documents: Array<{ documentId: string; filename: string; chunkCount: number }>
  }> {
    const { data, error } = await this.supabase
      .from('knowledge_chunks')
      .select('metadata')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('org_id', orgId)

    if (error) {
      throw error
    }

    const groupedDocuments = new Map<string, { filename: string; chunkCount: number }>()
    for (const chunk of data ?? []) {
      const metadata =
        chunk && typeof chunk.metadata === 'object' && chunk.metadata !== null
          ? (chunk.metadata as Record<string, unknown>)
          : {}
      const documentId = typeof metadata.document_id === 'string' ? metadata.document_id : null
      const filename = typeof metadata.source === 'string' ? metadata.source : 'Unknown'
      if (!documentId) {
        continue
      }

      const current = groupedDocuments.get(documentId)
      if (current) {
        current.chunkCount += 1
      } else {
        groupedDocuments.set(documentId, {
          filename,
          chunkCount: 1,
        })
      }
    }

    return {
      totalChunks: data?.length ?? 0,
      documents: Array.from(groupedDocuments.entries()).map(([documentId, info]) => ({
        documentId,
        filename: info.filename,
        chunkCount: info.chunkCount,
      })),
    }
  }

  async reprocessDocument(
    documentId: string,
    knowledgeBaseId: string,
    orgId: string,
    newFilePath: string,
  ): Promise<IngestedDocument> {
    await this.deleteDocument(documentId, knowledgeBaseId, orgId)
    return this.ingestDocument(newFilePath, knowledgeBaseId, orgId)
  }

  async ingestText(
    orgId: string,
    knowledgeBaseId: string,
    filename: string,
    content: string,
  ): Promise<IngestedDocument> {
    try {
      const chunks = this.chunkText(content)
      const result = await this.processChunks(chunks, knowledgeBaseId, orgId, filename)

      return {
        id: result.documentId,
        filename,
        type: 'text',
        chunksCount: chunks.length,
        status: 'completed',
      }
    } catch (error) {
      return {
        id: '',
        filename,
        type: 'text',
        chunksCount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown ingestion error',
      }
    }
  }

  private async extractText(filePath: string, fileExt: string): Promise<string> {
    switch (fileExt) {
      case '.pdf':
        return this.extractFromPdf(filePath)
      case '.doc':
      case '.docx':
        return this.extractFromDocx(filePath)
      case '.txt':
      case '.md':
      case '.json':
        return fs.readFileSync(filePath, 'utf-8')
      default:
        throw new Error(`Unsupported file type: ${fileExt}`)
    }
  }

  private async extractFromPdf(filePath: string): Promise<string> {
    const pdfModule = await this.importOptionalModule<{ default?: (buffer: Buffer) => Promise<{ text: string }> }>(
      'pdf-parse',
    )
    if (!pdfModule?.default) {
      throw new Error('PDF ingestion requires optional dependency "pdf-parse"')
    }

    const data = await pdfModule.default(fs.readFileSync(filePath))
    return data.text
  }

  private async extractFromDocx(filePath: string): Promise<string> {
    const mammothModule = await this.importOptionalModule<{
      extractRawText?: (input: { path: string }) => Promise<{ value: string }>
    }>('mammoth')
    if (!mammothModule?.extractRawText) {
      throw new Error('DOCX ingestion requires optional dependency "mammoth"')
    }

    const result = await mammothModule.extractRawText({ path: filePath })
    return result.value
  }

  private chunkText(text: string, chunkSize = 512, overlap = 50): string[] {
    const words = text.split(/\s+/).filter(Boolean)
    const chunks: string[] = []
    for (let index = 0; index < words.length; index += chunkSize - overlap) {
      const chunk = words.slice(index, index + chunkSize).join(' ').trim()
      if (chunk) {
        chunks.push(chunk)
      }
    }
    return chunks
  }

  private async processChunks(
    chunks: string[],
    knowledgeBaseId: string,
    orgId: string,
    filename: string,
  ): Promise<{ documentId: string; chunksProcessed: number }> {
    const documentId = `doc_${Date.now()}_${randomUUID()}`
    let chunksProcessed = 0

    for (let index = 0; index < chunks.length; index += 10) {
      const batch = chunks.slice(index, index + 10)
      const embeddings = await EmbeddingService.embedBatch(batch)

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        await this.hybridRAG.addKnowledgeChunk(knowledgeBaseId, orgId, batch[batchIndex], {
          source: filename,
          chunk_index: index + batchIndex,
          total_chunks: chunks.length,
          document_id: documentId,
          created_at: new Date().toISOString(),
          embedding_dimensions: embeddings[batchIndex]?.length ?? 0,
        })
        chunksProcessed += 1
      }
    }

    return { documentId, chunksProcessed }
  }

  private async importOptionalModule<T>(moduleName: string): Promise<T | null> {
    try {
      const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
        modulePath: string,
      ) => Promise<T>
      return await dynamicImport(moduleName)
    } catch {
      return null
    }
  }
}
