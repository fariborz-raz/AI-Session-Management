import { injectable, inject } from 'tsyringe';
import { ISessionService, SessionWithEntries } from './ISessionService';
import { ISessionRepository } from '../repositories/ISessionRepository';
import { ISessionEntryRepository } from '../repositories/ISessionEntryRepository';
import { ITranscriptChunkRepository } from '../repositories/ITranscriptChunkRepository';
import { ISummaryService } from './ISummaryService';
import { IEmbeddingService } from './IEmbeddingService';
import { ITranscriptionService } from './ITranscriptionService';
import { CreateSessionDto } from '../entities/Session';
import { CreateSessionEntryDto } from '../entities/SessionEntry';
import { EnvConfig } from '../config/EnvConfig';
import { AppError } from '../common/ErrorHandler';
import { TextChunker } from '../common/TextChunker';

@injectable()
export class SessionService implements ISessionService {
  constructor(
    @inject('ISessionRepository') private readonly sessionRepository: ISessionRepository,
    @inject('ISessionEntryRepository') private readonly entryRepository: ISessionEntryRepository,
    @inject('ITranscriptChunkRepository') private readonly chunkRepository: ITranscriptChunkRepository,
    @inject('ISummaryService') private readonly summaryService: ISummaryService,
    @inject('IEmbeddingService') private readonly embeddingService: IEmbeddingService,
    @inject('ITranscriptionService') private readonly transcriptionService: ITranscriptionService
  ) {}

  async createSession(dto: CreateSessionDto): Promise<{ sessionId: string }> {
    if (!dto.therapistId || !dto.clientId || !dto.startTime) {
      throw new AppError('Missing required fields: therapistId, clientId, startTime', 400);
    }

    return await this.sessionRepository.create(dto);
  }

  async getSession(sessionId: string): Promise<SessionWithEntries> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const entries = await this.entryRepository.findBySessionId(sessionId);

    return {
      sessionId: session.id,
      therapistId: session.therapistId,
      clientId: session.clientId,
      startTime: session.startTime,
      entries: entries.map(entry => ({
        id: entry.id,
        speaker: entry.speaker,
        content: entry.content,
        audioReference: entry.audioReference,
        transcript: entry.transcript,
        timestamp: entry.timestamp
      }))
    };
  }

  async getSessionsByTherapist(therapistId: string): Promise<Array<{
    sessionId: string;
    therapistId: string;
    clientId: string;
    startTime: string;
    entryCount?: number;
  }>> {
    if (!therapistId) {
      throw new AppError('therapistId is required', 400);
    }

    const sessions = await this.sessionRepository.findByTherapistId(therapistId);

    // Get entry counts for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const entries = await this.entryRepository.findBySessionId(session.id);
        return {
          sessionId: session.id,
          therapistId: session.therapistId,
          clientId: session.clientId,
          startTime: session.startTime,
          entryCount: entries.length
        };
      })
    );

    return sessionsWithCounts;
  }

  async addSessionEntry(sessionId: string, dto: CreateSessionEntryDto): Promise<{ entryId: string }> {
    if (!dto.speaker || !dto.timestamp) {
      throw new AppError('Missing required fields: speaker, timestamp', 400);
    }

    if (dto.speaker !== 'therapist' && dto.speaker !== 'client') {
      throw new AppError('Speaker must be either "therapist" or "client"', 400);
    }

    // Check if session exists
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Content or audioReference/transcript should be provided
    if (!dto.content && !dto.audioReference && !dto.transcript) {
      throw new AppError('Either content or audioReference/transcript must be provided', 400);
    }

    return await this.entryRepository.create(dto, sessionId);
  }

  async getSessionSummary(sessionId: string): Promise<{ summary: string }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // If summary already exists, return it
    if (session.summary) {
      return { summary: session.summary };
    }

    // Otherwise, generate summary from entries
    const entries = await this.entryRepository.findBySessionId(sessionId);
    const summary = await this.summaryService.generateSummary(entries);

    // Save the generated summary
    await this.sessionRepository.updateSummary(sessionId, summary);

    return { summary };
  }

  async transcribeSession(sessionId: string, audioBuffer: Buffer | null): Promise<{
    message: string;
    entries: Array<{ entryId: string }>;
    fullTranscript: string;
  }> {
    // Check if session exists
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const transcription = await this.transcriptionService.transcribeAudio(audioBuffer);

    // Create entries from transcription
    const createdEntries = [];
    for (const entry of transcription.entries) {
      const result = await this.entryRepository.create({
        speaker: entry.speaker,
        content: entry.content,
        transcript: entry.content,
        timestamp: entry.timestamp
      }, sessionId);
      createdEntries.push(result);
    }

    return {
      message: 'Audio transcribed successfully',
      entries: createdEntries,
      fullTranscript: transcription.fullTranscript
    };
  }

  async embedSession(sessionId: string): Promise<{
    message: string;
    embeddingDimensions: number;
  }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Get or generate summary
    let summary = session.summary;
    if (!summary) {
      const entries = await this.entryRepository.findBySessionId(sessionId);
      summary = await this.summaryService.generateSummary(entries);
      await this.sessionRepository.updateSummary(sessionId, summary);
    }

    // Generate and store summary embedding
    const embedding = await this.embeddingService.generateEmbedding(summary);
    await this.sessionRepository.updateEmbedding(sessionId, embedding);

    // Chunk and embed transcripts
    const entries = await this.entryRepository.findBySessionId(sessionId);
    let chunkCount = 0;

    // Delete existing chunks for this session
    await this.chunkRepository.deleteBySessionId(sessionId);

    // Process each entry with transcript
    for (const entry of entries) {
      const transcript = entry.transcript || entry.content;
      if (!transcript) {
        continue;
      }

      // Chunk the transcript
      const chunks = TextChunker.chunkText(
        transcript,
        EnvConfig.CHUNK_SIZE,
        EnvConfig.CHUNK_OVERLAP
      );

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const chunkEmbedding = await this.embeddingService.generateEmbedding(chunk.text);
        
        await this.chunkRepository.create({
          sessionId,
          entryId: entry.id,
          chunkText: chunk.text,
          embedding: chunkEmbedding,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          timestamp: entry.timestamp
        });
        chunkCount++;
      }
    }

    return {
      message: `Embedding generated and stored successfully. ${chunkCount} transcript chunks embedded.`,
      embeddingDimensions: embedding.length
    };
  }

  async searchSessions(query: string, therapistId?: string): Promise<{
    query: string;
    results: Array<{
      sessionId: string;
      therapistId: string;
      clientId: string;
      startTime: string;
      summary?: string;
      similarity: number;
      snippets?: Array<{
        text: string;
        timestamp: string;
        similarity: number;
      }>;
    }>;
  }> {
    if (!query) {
      throw new AppError('Query parameter is required', 400);
    }

    // Generate embedding for search query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Extract query terms for highlighting
    const queryTerms = query.split(/\s+/).filter(term => term.length > 2);

    // Get session IDs to filter by (if therapistId provided)
    let sessionIds: string[] | undefined;
    if (therapistId) {
      const therapistSessions = await this.sessionRepository.findByTherapistId(therapistId);
      sessionIds = therapistSessions.map(s => s.id);
      if (sessionIds.length === 0) {
        return { query, results: [] };
      }
    }

    // Search across transcript chunks (filtered by session IDs if therapistId provided)
    const chunks = await this.chunkRepository.findSimilarChunks(
      queryEmbedding,
      sessionIds,
      EnvConfig.SEARCH_RESULTS_LIMIT * 3 // Get more chunks to group by session
    );

    // Group chunks by session and calculate session-level similarity
    const sessionMap = new Map<string, {
      sessionId: string;
      chunks: Array<{ chunk: any; similarity: number }>;
      maxSimilarity: number;
    }>();

    for (const chunk of chunks) {
      const similarity = this.embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (!sessionMap.has(chunk.sessionId)) {
        sessionMap.set(chunk.sessionId, {
          sessionId: chunk.sessionId,
          chunks: [],
          maxSimilarity: similarity
        });
      }

      const sessionData = sessionMap.get(chunk.sessionId)!;
      sessionData.chunks.push({ chunk, similarity });
      if (similarity > sessionData.maxSimilarity) {
        sessionData.maxSimilarity = similarity;
      }
    }

    // Build results with snippets
    const results = [];
    for (const [sessionId, sessionData] of sessionMap.entries()) {
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        continue;
      }

      // Sort chunks by similarity and get top snippets
      const topChunks = sessionData.chunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3); // Top 3 snippets per session

      const snippets = topChunks.map(({ chunk, similarity }) => {
        const highlightedText = TextChunker.highlightText(chunk.chunkText, queryTerms);
        return {
          text: highlightedText,
          timestamp: chunk.timestamp,
          similarity: similarity
        };
      });

      results.push({
        sessionId: session.id,
        therapistId: session.therapistId,
        clientId: session.clientId,
        startTime: session.startTime,
        summary: session.summary,
        similarity: sessionData.maxSimilarity,
        snippets: snippets.length > 0 ? snippets : undefined
      });
    }

    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, EnvConfig.SEARCH_RESULTS_LIMIT);

    return {
      query,
      results: limitedResults
    };
  }
}

