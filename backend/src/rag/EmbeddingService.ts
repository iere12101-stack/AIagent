import OpenAI from 'openai'
import { env } from '../config/env.js'

export class EmbeddingService {
  private static readonly MODEL = 'text-embedding-3-small'
  private static readonly DIMENSIONS = 1536
  private static openaiClient: OpenAI | null = null

  private static getClient(): OpenAI {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI embeddings are unavailable because OPENAI_API_KEY is not configured')
    }

    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    }

    return this.openaiClient
  }

  static async embed(text: string): Promise<number[]> {
    try {
      const response = await this.getClient().embeddings.create({
        model: this.MODEL,
        input: text,
        dimensions: this.DIMENSIONS,
      })

      const embedding = response.data[0]?.embedding
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI')
      }

      return embedding
    } catch (error) {
      console.error('Embedding generation failed:', error)
      throw error
    }
  }

  static async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      return texts.map(() => new Array(this.DIMENSIONS).fill(0))
    }

    const embeddings: number[][] = []
    
    // Process in batches of 100 (OpenAI limit)
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100)
      
      try {
        const response = await this.getClient().embeddings.create({
          model: this.MODEL,
          input: batch,
          dimensions: this.DIMENSIONS,
        })

        const batchEmbeddings = response.data.map(item => item.embedding)
        embeddings.push(...batchEmbeddings)
      } catch (error) {
        console.error(`Batch embedding failed for items ${i}-${i + batch.length}:`, error)
        // For failed batches, add empty embeddings to maintain array length
        embeddings.push(...batch.map(() => new Array(this.DIMENSIONS).fill(0)))
      }
    }

    return embeddings
  }

  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) {
      return 0
    }

    return dotProduct / (norm1 * norm2)
  }

  static isAvailable(): boolean {
    return Boolean(env.OPENAI_API_KEY)
  }
}
