import { injectable } from 'tsyringe';
import { ITranscriptChunkRepository } from './ITranscriptChunkRepository';
import { TranscriptChunk, CreateTranscriptChunkDto } from '../entities/TranscriptChunk';
import { Database } from '../config/Database';
import { randomUUID } from 'crypto';
import { IEmbeddingService } from '../services/IEmbeddingService';

interface TranscriptChunkRow {
  id: string;
  sessionId: string;
  entryId: string | null;
  chunkText: string;
  embedding: string; // JSON-encoded
  startIndex: number;
  endIndex: number;
  timestamp: string;
  createdAt: string | null;
}

@injectable()
export class TranscriptChunkRepository implements ITranscriptChunkRepository {
  constructor(private readonly db: Database) {}

  async create(dto: CreateTranscriptChunkDto): Promise<{ chunkId: string }> {
    const chunkId = randomUUID();
    const embeddingJson = JSON.stringify(dto.embedding);
    
    const query = `
      INSERT INTO transcript_chunks (
        id, "sessionId", "entryId", "chunkText", embedding, 
        "startIndex", "endIndex", timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      chunkId,
      dto.sessionId,
      dto.entryId || null,
      dto.chunkText,
      embeddingJson,
      dto.startIndex,
      dto.endIndex,
      dto.timestamp
    ]);
    
    return { chunkId };
  }

  async findBySessionId(sessionId: string): Promise<TranscriptChunk[]> {
    const query = `
      SELECT * FROM transcript_chunks
      WHERE "sessionId" = ?
      ORDER BY timestamp ASC, "startIndex" ASC
    `;
    const rows = await this.db.query<TranscriptChunkRow>(query, [sessionId]);
    return rows.map(row => this.mapRowToChunk(row));
  }

  async findSimilarChunks(
    queryEmbedding: number[],
    sessionIds?: string[],
    limit: number = 10
  ): Promise<TranscriptChunk[]> {
    // Get all chunks (optionally filtered by session IDs)
    let query = `SELECT * FROM transcript_chunks`;
    const params: any[] = [];
    
    if (sessionIds && sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      query += ` WHERE "sessionId" IN (${placeholders})`;
      params.push(...sessionIds);
    }
    
    query += ` ORDER BY timestamp DESC`;
    
    const rows = await this.db.query<TranscriptChunkRow>(query, params);
    const chunks = rows.map(row => this.mapRowToChunk(row));
    
    // Calculate similarity for each chunk
    const chunksWithSimilarity = chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity and return top results
    return chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.chunk);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    const query = `DELETE FROM transcript_chunks WHERE "sessionId" = ?`;
    await this.db.run(query, [sessionId]);
  }

  private mapRowToChunk(row: TranscriptChunkRow): TranscriptChunk {
    return {
      id: row.id,
      sessionId: row.sessionId,
      entryId: row.entryId || null,
      chunkText: row.chunkText,
      embedding: JSON.parse(row.embedding),
      startIndex: row.startIndex,
      endIndex: row.endIndex,
      timestamp: row.timestamp,
      createdAt: row.createdAt || undefined
    };
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
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

