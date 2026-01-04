import 'reflect-metadata';
import { container } from 'tsyringe';
import { Database } from '../config/Database';
import { SessionRepository } from '../repositories/SessionRepository';
import { SessionEntryRepository } from '../repositories/SessionEntryRepository';
import { TranscriptChunkRepository } from '../repositories/TranscriptChunkRepository';
import { AIService } from '../services/AIService';
import { OpenAISummaryService } from '../services/OpenAISummaryService';
import { OpenAIEmbeddingService } from '../services/OpenAIEmbeddingService';
import { OpenAITranscriptionService } from '../services/OpenAITranscriptionService';
import { EnvConfig } from '../config/EnvConfig';
import { SessionService } from '../services/SessionService';
import { ISessionRepository } from '../repositories/ISessionRepository';
import { ISessionEntryRepository } from '../repositories/ISessionEntryRepository';
import { ITranscriptChunkRepository } from '../repositories/ITranscriptChunkRepository';
import { IAIService } from '../services/IAIService';
import { ISummaryService } from '../services/ISummaryService';
import { IEmbeddingService } from '../services/IEmbeddingService';
import { ITranscriptionService } from '../services/ITranscriptionService';
import { ISessionService } from '../services/ISessionService';

export function setupContainer(db: Database): void {
  // Register Database as singleton
  container.registerInstance(Database, db);

  // Register repositories
  container.register<ISessionRepository>('ISessionRepository', {
    useClass: SessionRepository
  });

  container.register<ISessionEntryRepository>('ISessionEntryRepository', {
    useClass: SessionEntryRepository
  });

  container.register<ITranscriptChunkRepository>('ITranscriptChunkRepository', {
    useClass: TranscriptChunkRepository
  });

  // Register OpenAI services (required - no mock implementations)
  if (!EnvConfig.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required. Please set it in your .env file.\n' +
      'Example: OPENAI_API_KEY=sk-proj-...'
    );
  }
  
  console.log('✅ Using OpenAI services');
  
  container.register<ISummaryService>('ISummaryService', {
    useClass: OpenAISummaryService
  });

  container.register<IEmbeddingService>('IEmbeddingService', {
    useClass: OpenAIEmbeddingService
  });

  container.register<ITranscriptionService>('ITranscriptionService', {
    useClass: OpenAITranscriptionService
  });

  // Register composite AI service (for backward compatibility)
  container.register<IAIService>('IAIService', {
    useClass: AIService
  });

  // Register application service
  container.register<ISessionService>('ISessionService', {
    useClass: SessionService
  });
}

export function getContainer() {
  return container;
}

