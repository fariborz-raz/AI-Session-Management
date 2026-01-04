import { CreateSessionDto } from '../entities/Session';
import { CreateSessionEntryDto } from '../entities/SessionEntry';

export interface SessionWithEntries {
  sessionId: string;
  therapistId: string;
  clientId: string;
  startTime: string;
  entries: Array<{
    id: string;
    speaker: 'therapist' | 'client';
    content?: string;
    audioReference?: string;
    transcript?: string;
    timestamp: string;
  }>;
}

export interface ISessionService {
  createSession(dto: CreateSessionDto): Promise<{ sessionId: string }>;
  getSession(sessionId: string): Promise<SessionWithEntries>;
  getSessionsByTherapist(therapistId: string): Promise<Array<{
    sessionId: string;
    therapistId: string;
    clientId: string;
    startTime: string;
    entryCount?: number;
  }>>;
  addSessionEntry(sessionId: string, dto: CreateSessionEntryDto): Promise<{ entryId: string }>;
  getSessionSummary(sessionId: string): Promise<{ summary: string }>;
  transcribeSession(sessionId: string, audioBuffer: Buffer | null): Promise<{
    message: string;
    entries: Array<{ entryId: string }>;
    fullTranscript: string;
  }>;
  embedSession(sessionId: string): Promise<{
    message: string;
    embeddingDimensions: number;
  }>;
  searchSessions(query: string, therapistId?: string): Promise<{
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
  }>;
}

