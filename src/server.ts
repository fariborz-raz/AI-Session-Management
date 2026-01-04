import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Database } from './config/Database';
import { setupContainer } from './di/container';
import { EnvConfig } from './config/EnvConfig';
import { ErrorHandler } from './common/ErrorHandler';
import sessionRoutes from './routes/sessionRoutes';
import searchRoutes from './routes/searchRoutes';

const app = express();
const PORT = EnvConfig.PORT;

// Middleware
app.use(cors({ origin: EnvConfig.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/sessions', sessionRoutes);
app.use('/search', searchRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Therapy Session Management API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      createSession: 'POST /sessions',
      listSessions: 'GET /sessions?therapistId=xxx',
      getSession: 'GET /sessions/:sessionId',
      getSummary: 'GET /sessions/:sessionId/summary',
      addEntry: 'POST /sessions/:sessionId/entries',
      transcribe: 'POST /sessions/:sessionId/transcribe',
      embed: 'POST /sessions/:sessionId/embed',
      search: 'GET /search/sessions?q=query&therapistId=optional'
    }
  });
});

// Error handling middleware (must be last)
// Handle 404 for unknown routes
app.use(ErrorHandler.notFound());

// Global error handler
app.use(ErrorHandler.handle());

// Initialize database and setup DI (for testing)
export async function initializeApp() {
  const db = new Database();
  await db.connect();
  setupContainer(db);
  return db;
}

// Initialize database and start server
async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, EnvConfig.HOST, () => {
      console.log(`Server running on ${EnvConfig.HOST}:${PORT}`);
      console.log(`Health check: http://${EnvConfig.HOST}:${PORT}/health`);
      console.log(`API documentation: http://${EnvConfig.HOST}:${PORT}/`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      // Database will be closed in test environment
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export app for testing
export { app };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

