/**
 * OpenAI Implementation of Embedding Service
 * Example production-ready implementation
 * 
 * To use: Update DI container to use this instead of EmbeddingService
 */

import { injectable } from 'tsyringe';
import { IEmbeddingService } from './IEmbeddingService';
import { EnvConfig } from '../config/EnvConfig';
import { AIRetryHelper } from '../common/AIRetryHelper';

@injectable()
export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly baseUrl: string;

  constructor() {
    if (!EnvConfig.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embedding service');
    }
    this.apiKey = EnvConfig.OPENAI_API_KEY;
    this.model = EnvConfig.OPENAI_EMBEDDING_MODEL;
    this.dimensions = EnvConfig.EMBEDDING_DIMENSIONS;
    this.baseUrl = EnvConfig.OPENAI_BASE_URL;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for embedding generation');
    }

    // Truncate text if too long (OpenAI has token limits)
    const maxLength = 8000; // Approximate token limit
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    // Call OpenAI with retry logic
    return AIRetryHelper.retry(async () => {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: truncatedText,
          dimensions: this.dimensions,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      const embedding = data.data[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      return embedding;
    });
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

