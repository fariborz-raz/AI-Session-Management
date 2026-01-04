export interface TranscriptChunk {
  id: string;
  sessionId: string;
  entryId: string | null;
  chunkText: string;
  embedding: number[];
  startIndex: number;
  endIndex: number;
  timestamp: string;
  createdAt?: string;
}

export interface CreateTranscriptChunkDto {
  sessionId: string;
  entryId?: string;
  chunkText: string;
  embedding: number[];
  startIndex: number;
  endIndex: number;
  timestamp: string;
}

