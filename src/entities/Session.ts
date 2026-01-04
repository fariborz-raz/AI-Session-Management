export interface Session {
  id: string;
  therapistId: string;
  clientId: string;
  startTime: string;
  summary?: string;
  embedding?: number[];
  createdAt?: string;
}

export interface CreateSessionDto {
  therapistId: string;
  clientId: string;
  startTime: string;
}

