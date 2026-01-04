/**
 * OpenAI Whisper Implementation of Transcription Service
 * Example production-ready implementation
 * 
 * To use: Update DI container to use this instead of TranscriptionService
 */

import { injectable } from 'tsyringe';
import { ITranscriptionService } from './ITranscriptionService';
import { TranscriptionResult } from '../entities/SessionEntry';
import { EnvConfig } from '../config/EnvConfig';
import { AIRetryHelper } from '../common/AIRetryHelper';

@injectable()
export class OpenAITranscriptionService implements ITranscriptionService {
  private readonly apiKey: string;
  private readonly model: string = 'whisper-1';
  private readonly baseUrl: string;

  constructor() {
    if (!EnvConfig.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI transcription service');
    }
    this.apiKey = EnvConfig.OPENAI_API_KEY;
    this.baseUrl = EnvConfig.OPENAI_BASE_URL;
  }

  async transcribeAudio(audioBuffer: Buffer | null): Promise<TranscriptionResult> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is required for transcription');
    }

    // Check file size (OpenAI Whisper has 25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > maxSize) {
      throw new Error(`Audio file too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    // Call OpenAI Whisper API with retry logic
    return AIRetryHelper.retry(async () => {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('file', blob, 'audio.mp3');
      formData.append('model', this.model);
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'en'); // Optional: detect language automatically

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;

      // Parse transcription result
      // Note: Real implementation would use speaker diarization service
      // For now, we'll split by sentences/segments and assign speakers
      const transcript = data.text || '';
      const segments = data.segments || [];

      // Simple speaker assignment (in production, use dedicated diarization service)
      const entries = segments.map((segment: any, index: number) => ({
        speaker: index % 2 === 0 ? 'therapist' : 'client' as const,
        content: segment.text || '',
        timestamp: new Date(segment.start * 1000).toISOString(),
      }));

      // Fallback if no segments
      if (entries.length === 0 && transcript) {
        entries.push({
          speaker: 'therapist',
          content: transcript,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        entries,
        fullTranscript: transcript,
      };
    });
  }
}

