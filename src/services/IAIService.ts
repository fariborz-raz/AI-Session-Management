import { ISummaryService } from './ISummaryService';
import { IEmbeddingService } from './IEmbeddingService';
import { ITranscriptionService } from './ITranscriptionService';

// Composite interface for backward compatibility
// In practice, use the specific service interfaces
export interface IAIService extends ISummaryService, IEmbeddingService, ITranscriptionService {}

