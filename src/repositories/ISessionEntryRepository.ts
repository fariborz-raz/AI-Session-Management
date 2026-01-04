import { SessionEntry, CreateSessionEntryDto, Speaker } from '../entities/SessionEntry';

export interface ISessionEntryRepository {
  create(dto: CreateSessionEntryDto, sessionId: string): Promise<{ entryId: string }>;
  findBySessionId(sessionId: string): Promise<SessionEntry[]>;
  findBySessionIdAndSpeaker(sessionId: string, speaker: Speaker): Promise<SessionEntry[]>;
  sessionExists(sessionId: string): Promise<boolean>;
}

