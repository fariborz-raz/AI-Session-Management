import { injectable } from 'tsyringe';
import { ISessionRepository } from './ISessionRepository';
import { Session, CreateSessionDto } from '../entities/Session';
import { Database } from '../config/Database';
import { randomUUID } from 'crypto';

interface SessionRow {
  id: string;
  therapistId: string;
  clientId: string;
  startTime: string;
  summary: string | null;
  embedding: string | null;
  createdAt: string | null;
}

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(private readonly db: Database) {}

  async create(dto: CreateSessionDto): Promise<{ sessionId: string }> {
    const sessionId = randomUUID();
    const query = `
      INSERT INTO sessions (id, "therapistId", "clientId", "startTime")
      VALUES (?, ?, ?, ?)
    `;
    
    await this.db.run(query, [sessionId, dto.therapistId, dto.clientId, dto.startTime]);
    return { sessionId };
  }

  async findById(sessionId: string): Promise<Session | null> {
    const query = `SELECT * FROM sessions WHERE id = ?`;
    const row = await this.db.get<SessionRow>(query, [sessionId]);
    
    if (!row) {
      return null;
    }

    return this.mapRowToSession(row);
  }

  async findByTherapistId(therapistId: string): Promise<Session[]> {
    const query = `SELECT * FROM sessions WHERE "therapistId" = ? ORDER BY "startTime" DESC`;
    const rows = await this.db.query<SessionRow>(query, [therapistId]);
    return rows.map(row => this.mapRowToSession(row));
  }

  async updateSummary(sessionId: string, summary: string): Promise<void> {
    const query = `UPDATE sessions SET summary = ? WHERE id = ?`;
    await this.db.run(query, [summary, sessionId]);
  }

  async updateEmbedding(sessionId: string, embedding: number[]): Promise<void> {
    const embeddingJson = JSON.stringify(embedding);
    const query = `UPDATE sessions SET embedding = ? WHERE id = ?`;
    await this.db.run(query, [embeddingJson, sessionId]);
  }

  async findAllWithEmbeddings(): Promise<Session[]> {
    const query = `SELECT id, "therapistId", "clientId", "startTime", summary, embedding FROM sessions WHERE embedding IS NOT NULL`;
    const rows = await this.db.query<SessionRow>(query);
    return rows.map(row => this.mapRowToSession(row));
  }

  async findByTherapistWithEmbeddings(therapistId: string): Promise<Session[]> {
    const query = `
      SELECT id, "therapistId", "clientId", "startTime", summary, embedding 
      FROM sessions 
      WHERE "therapistId" = ? AND embedding IS NOT NULL
    `;
    const rows = await this.db.query<SessionRow>(query, [therapistId]);
    return rows.map(row => this.mapRowToSession(row));
  }

  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      therapistId: row.therapistId,
      clientId: row.clientId,
      startTime: row.startTime,
      summary: row.summary || undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      createdAt: row.createdAt || undefined
    };
  }
}

