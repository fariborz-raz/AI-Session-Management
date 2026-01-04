import { TranscriptionResult } from '../entities/SessionEntry';

export interface ITranscriptionService {
  transcribeAudio(audioBuffer: Buffer | null): Promise<TranscriptionResult>;
}

