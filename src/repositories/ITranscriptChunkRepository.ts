import { TranscriptChunk, CreateTranscriptChunkDto } from '../entities/TranscriptChunk';

export interface ITranscriptChunkRepository {
  create(dto: CreateTranscriptChunkDto): Promise<{ chunkId: string }>;
  findBySessionId(sessionId: string): Promise<TranscriptChunk[]>;
  findSimilarChunks(queryEmbedding: number[], sessionIds?: string[], limit?: number): Promise<TranscriptChunk[]>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

