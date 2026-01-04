import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
  // Server Configuration
  static readonly PORT: number = parseInt(process.env.PORT || '3000', 10);
  static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  static readonly HOST: string = process.env.HOST || 'localhost';

  // Database Configuration
  static readonly DB_TYPE: string = process.env.DB_TYPE || 'sqlite';
  static readonly DB_PATH: string = process.env.DB_PATH || 'sessions.db';
  
  // PostgreSQL Configuration
  static readonly DB_HOST: string = process.env.DB_HOST || 'localhost';
  static readonly DB_PORT: number = parseInt(process.env.DB_PORT || '5432', 10);
  static readonly DB_USER: string = process.env.DB_USER || 'sessionuser';
  static readonly DB_PASSWORD: string = process.env.DB_PASSWORD || 'sessionpass';
  static readonly DB_NAME: string = process.env.DB_NAME || 'sessions';

  // File Upload Configuration
  static readonly MAX_FILE_SIZE: number = parseInt(
    process.env.MAX_FILE_SIZE || (50 * 1024 * 1024).toString(),
    10
  ); // Default 50MB
  static readonly ALLOWED_AUDIO_MIME_TYPES: string = process.env.ALLOWED_AUDIO_MIME_TYPES || 'audio/*';

  // AI/ML Configuration
  static readonly EMBEDDING_DIMENSIONS: number = parseInt(
    process.env.EMBEDDING_DIMENSIONS || '1536',
    10
  );
  static readonly SUMMARY_ENTRIES_COUNT: number = parseInt(
    process.env.SUMMARY_ENTRIES_COUNT || '3',
    10
  );
  static readonly SEARCH_RESULTS_LIMIT: number = parseInt(
    process.env.SEARCH_RESULTS_LIMIT || '10',
    10
  );
  static readonly CHUNK_SIZE: number = parseInt(
    process.env.CHUNK_SIZE || '500',
    10
  ); // Characters per chunk
  static readonly CHUNK_OVERLAP: number = parseInt(
    process.env.CHUNK_OVERLAP || '50',
    10
  ); // Character overlap between chunks

  // OpenAI Configuration
  static readonly OPENAI_API_KEY: string | undefined = process.env.OPENAI_API_KEY;
  static readonly OPENAI_MODEL: string = process.env.OPENAI_MODEL || 'gpt-4';
  static readonly OPENAI_EMBEDDING_MODEL: string = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  static readonly OPENAI_BASE_URL: string = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  static readonly OPENAI_MAX_TOKENS: number = parseInt(
    process.env.OPENAI_MAX_TOKENS || '500',
    10
  );
  static readonly OPENAI_TEMPERATURE: number = parseFloat(
    process.env.OPENAI_TEMPERATURE || '0.7'
  );
  
  // AI Rate Limiting
  static readonly AI_MAX_REQUESTS_PER_MINUTE: number = parseInt(
    process.env.AI_MAX_REQUESTS_PER_MINUTE || '60',
    10
  );
  static readonly AI_RETRY_MAX_ATTEMPTS: number = parseInt(
    process.env.AI_RETRY_MAX_ATTEMPTS || '3',
    10
  );
  static readonly AI_RETRY_INITIAL_DELAY: number = parseInt(
    process.env.AI_RETRY_INITIAL_DELAY || '1000',
    10
  );
  static readonly AI_RETRY_MAX_DELAY: number = parseInt(
    process.env.AI_RETRY_MAX_DELAY || '10000',
    10
  );
  
  // Database Connection Pool Configuration
  static readonly DB_POOL_MAX: number = parseInt(
    process.env.DB_POOL_MAX || '20',
    10
  );
  static readonly DB_POOL_IDLE_TIMEOUT: number = parseInt(
    process.env.DB_POOL_IDLE_TIMEOUT || '30000',
    10
  );
  static readonly DB_POOL_CONNECTION_TIMEOUT: number = parseInt(
    process.env.DB_POOL_CONNECTION_TIMEOUT || '2000',
    10
  );

  // CORS Configuration
  static readonly CORS_ORIGIN: string = process.env.CORS_ORIGIN || '*';

  // Validation
  static validate(): void {
    const required: Array<{ key: string; value: any }> = [
      { key: 'PORT', value: EnvConfig.PORT },
      { key: 'EMBEDDING_DIMENSIONS', value: EnvConfig.EMBEDDING_DIMENSIONS },
    ];

    const errors: string[] = [];

    if (isNaN(EnvConfig.PORT) || EnvConfig.PORT < 1 || EnvConfig.PORT > 65535) {
      errors.push('PORT must be a valid number between 1 and 65535');
    }

    if (isNaN(EnvConfig.EMBEDDING_DIMENSIONS) || EnvConfig.EMBEDDING_DIMENSIONS < 1) {
      errors.push('EMBEDDING_DIMENSIONS must be a positive number');
    }

    if (isNaN(EnvConfig.MAX_FILE_SIZE) || EnvConfig.MAX_FILE_SIZE < 1) {
      errors.push('MAX_FILE_SIZE must be a positive number');
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }
}

// Validate on import
EnvConfig.validate();

