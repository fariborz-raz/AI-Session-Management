import { Session, CreateSessionDto } from '../entities/Session';

export interface ISessionRepository {
  create(dto: CreateSessionDto): Promise<{ sessionId: string }>;
  findById(sessionId: string): Promise<Session | null>;
  findByTherapistId(therapistId: string): Promise<Session[]>;
  updateSummary(sessionId: string, summary: string): Promise<void>;
  updateEmbedding(sessionId: string, embedding: number[]): Promise<void>;
  findAllWithEmbeddings(): Promise<Session[]>;
  findByTherapistWithEmbeddings(therapistId: string): Promise<Session[]>;
}

