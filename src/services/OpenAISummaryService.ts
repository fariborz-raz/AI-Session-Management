/**
 * OpenAI Implementation of Summary Service
 * Example production-ready implementation
 * 
 * To use: Update DI container to use this instead of SummaryService
 */

import { injectable } from 'tsyringe';
import { ISummaryService } from './ISummaryService';
import { SessionEntry } from '../entities/SessionEntry';
import { EnvConfig } from '../config/EnvConfig';
import { AIRetryHelper } from '../common/AIRetryHelper';

@injectable()
export class OpenAISummaryService implements ISummaryService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly baseUrl: string;

  constructor() {
    if (!EnvConfig.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI summary service');
    }
    this.apiKey = EnvConfig.OPENAI_API_KEY;
    this.model = EnvConfig.OPENAI_MODEL;
    this.maxTokens = EnvConfig.OPENAI_MAX_TOKENS;
    this.temperature = EnvConfig.OPENAI_TEMPERATURE;
    this.baseUrl = EnvConfig.OPENAI_BASE_URL;
  }

  async generateSummary(entries: SessionEntry[]): Promise<string> {
    if (!entries || entries.length === 0) {
      return 'No session entries available for summarization.';
    }

    // Prepare conversation context
    const conversation = entries.map(entry => {
      const role = entry.speaker === 'therapist' ? 'Therapist' : 'Client';
      const content = entry.content || entry.transcript || '';
      return `${role}: ${content}`;
    }).join('\n\n');

    // Build prompt
    const prompt = `Summarize the following therapy session conversation. Focus on key themes, emotions, and progress:\n\n${conversation}\n\nSummary:`;

    // Call OpenAI with retry logic
    return AIRetryHelper.retry(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional therapist assistant. Summarize therapy sessions concisely.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || 'Unable to generate summary.';
    });
  }
}

