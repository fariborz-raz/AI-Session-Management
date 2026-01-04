import { SessionEntry } from '../entities/SessionEntry';

export interface ISummaryService {
  generateSummary(entries: SessionEntry[]): Promise<string>;
}

