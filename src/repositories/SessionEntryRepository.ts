import { injectable } from 'tsyringe';
import { ISessionEntryRepository } from './ISessionEntryRepository';
import { SessionEntry, CreateSessionEntryDto, Speaker } from '../entities/SessionEntry';
import { Database } from '../config/Database';
import { randomUUID } from 'crypto';

interface SessionEntryRow {
  id: string;
  sessionId: string;
  speaker: Speaker;
  content: string | null;
  audioReference: string | null;
  transcript: string | null;
  timestamp: string;
  createdAt: string | null;
}

@injectable()
export class SessionEntryRepository implements ISessionEntryRepository {
  constructor(private readonly db: Database) {}

  async create(dto: CreateSessionEntryDto, sessionId: string): Promise<{ entryId: string }> {
    if (dto.speaker !== 'therapist' && dto.speaker !== 'client') {
      throw new Error('Speaker must be either "therapist" or "client"');
    }

    const entryId = randomUUID();
    const query = `
      INSERT INTO session_entries (id, "sessionId", speaker, content, "audioReference", transcript, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      entryId,
      sessionId,
      dto.speaker,
      dto.content || null,
      dto.audioReference || null,
      dto.transcript || null,
      dto.timestamp
    ]);
    
    return { entryId };
  }

  async findBySessionId(sessionId: string): Promise<SessionEntry[]> {
    const query = `
      SELECT id, "sessionId", speaker, content, "audioReference", transcript, timestamp, "createdAt"
      FROM session_entries
      WHERE "sessionId" = ?
      ORDER BY timestamp ASC
    `;
    const rows = await this.db.query<SessionEntryRow & { sessionId: string }>(query, [sessionId]);
    return rows.map(row => this.mapRowToEntry(row));
  }

  async findBySessionIdAndSpeaker(sessionId: string, speaker: Speaker): Promise<SessionEntry[]> {
    const query = `
      SELECT id, "sessionId", speaker, content, "audioReference", transcript, timestamp, "createdAt"
      FROM session_entries
      WHERE "sessionId" = ? AND speaker = ?
      ORDER BY timestamp ASC
    `;
    const rows = await this.db.query<SessionEntryRow & { sessionId: string }>(query, [sessionId, speaker]);
    return rows.map(row => this.mapRowToEntry(row));
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM session_entries WHERE "sessionId" = ?`;
    const result = await this.db.get<{ count: number }>(query, [sessionId]);
    return (result?.count || 0) > 0;
  }

  private mapRowToEntry(row: SessionEntryRow & { sessionId: string }): SessionEntry {
    return {
      id: row.id,
      sessionId: row.sessionId,
      speaker: row.speaker,
      content: row.content || undefined,
      audioReference: row.audioReference || undefined,
      transcript: row.transcript || undefined,
      timestamp: row.timestamp,
      createdAt: row.createdAt || undefined
    };
  }
}

