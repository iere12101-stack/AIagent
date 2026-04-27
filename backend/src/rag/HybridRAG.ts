import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js'
import { EmbeddingService } from './EmbeddingService.js'

interface SearchResult {
  id: string
  content: string
  metadata: Record<string, unknown> | null
  score: number
}

export class HybridRAG {
  private readonly supabase = isSupabaseConfigured() ? getSupabaseAdmin() : null

  constructor() {}

  async search(
    query: string,
    knowledgeBaseId: string,
    orgId: string,
    topK = 5
  ): Promise<string> {
    if (!this.supabase) {
      return ''
    }

    try {
      const semanticResults = await this.semanticSearch(query, knowledgeBaseId, orgId, topK * 2)
      const fullTextResults = await this.fullTextSearch(query, knowledgeBaseId, orgId, topK * 2)
      const mergedResults = this.mergeResults(semanticResults, fullTextResults, topK)
      return this.formatResults(mergedResults)
    } catch (error) {
      console.error('Hybrid RAG search failed:', error)
      return ''
    }
  }

  private async semanticSearch(
    query: string,
    knowledgeBaseId: string,
    orgId: string,
    limit: number
  ): Promise<SearchResult[]> {
    if (!this.supabase) {
      return []
    }

    try {
      const embedding = await EmbeddingService.embed(query)
      
      const { data, error } = await this.supabase.rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        kb_id: knowledgeBaseId,
        org_id: orgId,
        match_count: limit,
        similarity_threshold: 0.65
      })

      if (error) {
        console.error('Semantic search error:', error)
        return []
      }

      return (data || []).map((item: { id: string; content: string; metadata: Record<string, unknown> | null; similarity?: number }) => ({
        id: item.id,
        content: item.content,
        metadata: item.metadata,
        score: item.similarity || 0
      }))
    } catch (error) {
      console.error('Semantic search failed:', error)
      return []
    }
  }

  private async fullTextSearch(
    query: string,
    knowledgeBaseId: string,
    orgId: string,
    limit: number
  ): Promise<SearchResult[]> {
    if (!this.supabase) {
      return []
    }

    try {
      const tsQuery = query.split(' ').join(' & ')
      
      const { data, error } = await this.supabase
        .from('knowledge_chunks')
        .select('id, content, metadata')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('org_id', orgId)
        .textSearch('content', tsQuery, {
          type: 'websearch',
          config: 'english'
        })
        .limit(limit)

      if (error) {
        console.error('Full-text search error:', error)
        return []
      }

      return (data || []).map((item: { id: string; content: string; metadata: Record<string, unknown> | null }) => ({
        id: item.id,
        content: item.content,
        metadata: item.metadata,
        score: 1.0 // BM25 scoring handled by PostgreSQL
      }))
    } catch (error) {
      console.error('Full-text search failed:', error)
      return []
    }
  }

  private mergeResults(
    semanticResults: SearchResult[],
    fullTextResults: SearchResult[],
    topK: number
  ): SearchResult[] {
    const scoreMap = new Map<string, SearchResult>()
    
    // Reciprocal Rank Fusion (RRF)
    const k = 60 // Standard RRF constant
    
    // Process semantic results
    semanticResults.forEach((result, index) => {
      const rrfScore = 1.0 / (k + index + 1)
      scoreMap.set(result.id, {
        ...result,
        score: rrfScore
      })
    })
    
    // Process full-text results and add to scores
    fullTextResults.forEach((result, index) => {
      const rrfScore = 1.0 / (k + index + 1)
      const existing = scoreMap.get(result.id)
      
      if (existing) {
        existing.score += rrfScore
      } else {
        scoreMap.set(result.id, {
          ...result,
          score: rrfScore
        })
      }
    })
    
    // Sort by combined score and return top K
    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  private formatResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return ''
    }

    return results
      .map((result, index) => {
        const source = result.metadata?.source || 'Unknown'
        const page = result.metadata?.page || 'N/A'
        
        return `[${index + 1}] ${result.content}\n   Source: ${source} (Page: ${page})`
      })
      .join('\n\n---\n\n')
  }

  async addKnowledgeChunk(
    knowledgeBaseId: string,
    orgId: string,
    content: string,
    metadata: any
  ): Promise<string> {
    if (!this.supabase) {
      return ''
    }

    try {
      const embedding = await EmbeddingService.embed(content)
      
      const { data, error } = await this.supabase
        .from('knowledge_chunks')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          org_id: orgId,
          content,
          embedding,
          metadata
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Failed to add knowledge chunk:', error)
      throw error
    }
  }

  async deleteKnowledgeChunk(chunkId: string): Promise<void> {
    if (!this.supabase) {
      return
    }

    try {
      const { error } = await this.supabase
        .from('knowledge_chunks')
        .delete()
        .eq('id', chunkId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to delete knowledge chunk:', error)
      throw error
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.supabase) {
      return false
    }

    try {
      if (!EmbeddingService.isAvailable()) {
        return false
      }

      const { error } = await this.supabase.rpc('match_knowledge_chunks', {
        query_embedding: new Array(1536).fill(0),
        kb_id: '00000000-0000-0000-0000-000000000000',
        org_id: '00000000-0000-0000-0000-000000000000',
        match_count: 1,
        similarity_threshold: 0.1
      })
      return !error || !error.message?.includes('function')
    } catch {
      return false
    }
  }
}
