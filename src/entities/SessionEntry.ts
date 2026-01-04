export type Speaker = 'therapist' | 'client';

export interface SessionEntry {
  id: string;
  sessionId: string;
  speaker: Speaker;
  content?: string;
  audioReference?: string;
  transcript?: string;
  timestamp: string;
  createdAt?: string;
}

export interface CreateSessionEntryDto {
  speaker: Speaker;
  content?: string;
  audioReference?: string;
  transcript?: string;
  timestamp: string;
}

export interface TranscriptionEntry {
  speaker: Speaker;
  content: string;
  timestamp: string;
}

export interface TranscriptionResult {
  entries: TranscriptionEntry[];
  fullTranscript: string;
}

