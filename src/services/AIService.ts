import { injectable, inject } from 'tsyringe';
import { IAIService } from './IAIService';
import { ISummaryService } from './ISummaryService';
import { IEmbeddingService } from './IEmbeddingService';
import { ITranscriptionService } from './ITranscriptionService';
import { SessionEntry, TranscriptionResult } from '../entities/SessionEntry';

// Composite service that delegates to specific services
// This maintains backward compatibility while allowing separate services
@injectable()
export class AIService implements IAIService {
  constructor(
    @inject('ISummaryService') private readonly summaryService: ISummaryService,
    @inject('IEmbeddingService') private readonly embeddingService: IEmbeddingService,
    @inject('ITranscriptionService') private readonly transcriptionService: ITranscriptionService
  ) {}

  async generateSummary(entries: SessionEntry[]): Promise<string> {
    return this.summaryService.generateSummary(entries);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingService.generateEmbedding(text);
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    return this.embeddingService.cosineSimilarity(vecA, vecB);
  }

  async transcribeAudio(audioBuffer: Buffer | null): Promise<TranscriptionResult> {
    return this.transcriptionService.transcribeAudio(audioBuffer);
  }
}

