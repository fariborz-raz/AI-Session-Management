import sqlite3, { Database as SQLiteDatabase } from 'sqlite3';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import path from 'path';
import { EnvConfig } from './EnvConfig';

type DatabaseConnection = SQLiteDatabase | PoolClient | Pool;

export class Database {
  private db: DatabaseConnection | null = null;
  private readonly dbType: string;
  private readonly dbPath: string;
  private pool: Pool | null = null;

  constructor(dbPath?: string) {
    this.dbType = EnvConfig.DB_TYPE;
    
    if (this.dbType === 'sqlite') {
      // Use environment config or provided path or default
      const configPath = path.isAbsolute(EnvConfig.DB_PATH) 
        ? EnvConfig.DB_PATH 
        : path.join(__dirname, '../../../', EnvConfig.DB_PATH);
      this.dbPath = dbPath || configPath;
    } else {
      this.dbPath = '';
    }
  }

  async connect(): Promise<void> {
    if (this.dbType === 'postgres') {
      return this.connectPostgres();
    } else {
      return this.connectSQLite();
    }
  }

  private connectSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new SQLiteDatabase(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initializeTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async connectPostgres(): Promise<void> {
    this.pool = new Pool({
      host: EnvConfig.DB_HOST,
      port: EnvConfig.DB_PORT,
      user: EnvConfig.DB_USER,
      password: EnvConfig.DB_PASSWORD,
      database: EnvConfig.DB_NAME,
      max: EnvConfig.DB_POOL_MAX,
      idleTimeoutMillis: EnvConfig.DB_POOL_IDLE_TIMEOUT,
      connectionTimeoutMillis: EnvConfig.DB_POOL_CONNECTION_TIMEOUT,
    });

    try {
      // Test connection
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database');
      this.db = client;
      
      // Initialize tables
      await this.initializeTables();
      
      // Release client back to pool
      client.release();
    } catch (err) {
      console.error('Error connecting to PostgreSQL:', err);
      throw err;
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (this.dbType === 'postgres') {
      await this.initializePostgresTables();
    } else {
      await this.initializeSQLiteTables();
    }
  }

  private async initializeSQLiteTables(): Promise<void> {
    if (!this.db || this.dbType !== 'sqlite') {
      throw new Error('SQLite database not initialized');
    }

    // Enable foreign keys
    await this.run('PRAGMA foreign_keys = ON');

    const queries = this.getTableQueries(false);
    for (const query of queries) {
      await this.run(query);
    }
  }

  private async initializePostgresTables(): Promise<void> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const queries = this.getTableQueries(true);
    for (const query of queries) {
      await this.run(query);
    }
  }

  private getTableQueries(forPostgres: boolean = false): string[] {
    const textType = 'TEXT';
    const timestampDefault = 'DEFAULT CURRENT_TIMESTAMP';
    const integerType = forPostgres ? 'INTEGER' : 'INTEGER';
    
    return [
      `CREATE TABLE IF NOT EXISTS sessions (
        id ${textType} PRIMARY KEY,
        "therapistId" ${textType} NOT NULL,
        "clientId" ${textType} NOT NULL,
        "startTime" ${textType} NOT NULL,
        summary ${textType},
        embedding ${textType},
        "createdAt" ${textType} ${timestampDefault}
      )`,
      `CREATE TABLE IF NOT EXISTS session_entries (
        id ${textType} PRIMARY KEY,
        "sessionId" ${textType} NOT NULL,
        speaker ${textType} NOT NULL CHECK(speaker IN ('therapist', 'client')),
        content ${textType},
        "audioReference" ${textType},
        transcript ${textType},
        timestamp ${textType} NOT NULL,
        "createdAt" ${textType} ${timestampDefault},
        FOREIGN KEY ("sessionId") REFERENCES sessions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS transcript_chunks (
        id ${textType} PRIMARY KEY,
        "sessionId" ${textType} NOT NULL,
        "entryId" ${textType},
        "chunkText" ${textType} NOT NULL,
        embedding ${textType} NOT NULL,
        "startIndex" ${integerType} NOT NULL,
        "endIndex" ${integerType} NOT NULL,
        timestamp ${textType} NOT NULL,
        "createdAt" ${textType} ${timestampDefault},
        FOREIGN KEY ("sessionId") REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY ("entryId") REFERENCES session_entries(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_session_entries_sessionId ON session_entries("sessionId")`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_therapistId ON sessions("therapistId")`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_clientId ON sessions("clientId")`,
      `CREATE INDEX IF NOT EXISTS idx_transcript_chunks_sessionId ON transcript_chunks("sessionId")`,
      `CREATE INDEX IF NOT EXISTS idx_transcript_chunks_timestamp ON transcript_chunks(timestamp)`
    ];
  }

  // Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
  private convertPlaceholders(sql: string): { sql: string; paramIndex: number } {
    if (this.dbType !== 'postgres') {
      return { sql, paramIndex: 0 };
    }

    let paramIndex = 1;
    const converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: converted, paramIndex: paramIndex - 1 };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.dbType === 'postgres') {
      const { sql: convertedSql } = this.convertPlaceholders(sql);
      const result = await this.queryPostgres(convertedSql, params);
      return result as T[];
    } else {
      return this.querySQLite<T>(sql, params);
    }
  }

  private querySQLite<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db || this.dbType !== 'sqlite') {
        reject(new Error('SQLite database not initialized'));
        return;
      }

      (this.db as SQLiteDatabase).all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  private async queryPostgres<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows;
    } catch (err) {
      throw err;
    }
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    if (this.dbType === 'postgres') {
      const { sql: convertedSql } = this.convertPlaceholders(sql);
      return this.runPostgres(convertedSql, params);
    } else {
      return this.runSQLite(sql, params);
    }
  }

  private runSQLite(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db || this.dbType !== 'sqlite') {
        reject(new Error('SQLite database not initialized'));
        return;
      }

      (this.db as SQLiteDatabase).run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private async runPostgres(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    try {
      const result = await this.pool.query(sql, params);
      return {
        lastID: result.rows[0]?.id || 0,
        changes: result.rowCount || 0
      };
    } catch (err) {
      throw err;
    }
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (this.dbType === 'postgres') {
      const { sql: convertedSql } = this.convertPlaceholders(sql);
      const result = await this.getPostgres(convertedSql, params);
      return result as T | undefined;
    } else {
      return this.getSQLite<T>(sql, params);
    }
  }

  private getSQLite<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db || this.dbType !== 'sqlite') {
        reject(new Error('SQLite database not initialized'));
        return;
      }

      (this.db as SQLiteDatabase).get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T | undefined);
        }
      });
    });
  }

  private async getPostgres<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows[0] as T | undefined;
    } catch (err) {
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.dbType === 'postgres') {
      if (this.pool) {
        await this.pool.end();
        console.log('PostgreSQL connection pool closed');
      }
    } else {
      return new Promise((resolve, reject) => {
        if (this.db && this.dbType === 'sqlite') {
          (this.db as SQLiteDatabase).close((err) => {
            if (err) {
              reject(err);
            } else {
              console.log('SQLite database connection closed');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    }
  }
}
