import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ISessionService } from '../services/ISessionService';
import { ErrorHandler, AppError } from '../common/ErrorHandler';

export class SessionController {
  private readonly sessionService: ISessionService;

  constructor() {
    this.sessionService = container.resolve<ISessionService>('ISessionService');
  }

  createSession = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { therapistId, clientId, startTime } = req.body;
    
    if (!therapistId || !clientId || !startTime) {
      throw new AppError('Missing required fields: therapistId, clientId, startTime', 400);
    }

    const result = await this.sessionService.createSession({ therapistId, clientId, startTime });
    res.status(201).json(result);
  });

  getSession = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const session = await this.sessionService.getSession(sessionId);
    res.json(session);
  });

  getSessionsByTherapist = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { therapistId } = req.query;
    
    if (!therapistId || typeof therapistId !== 'string') {
      throw new AppError('Query parameter "therapistId" is required', 400);
    }

    const sessions = await this.sessionService.getSessionsByTherapist(therapistId);
    res.json(sessions);
  });

  getSessionSummary = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const result = await this.sessionService.getSessionSummary(sessionId);
    res.json(result);
  });

  addSessionEntry = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const { speaker, content, timestamp, audioReference, transcript } = req.body;
    
    const result = await this.sessionService.addSessionEntry(sessionId, {
      speaker,
      content,
      timestamp,
      audioReference,
      transcript
    });
    
    res.status(201).json(result);
  });

  transcribeSession = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const audioBuffer = req.file ? req.file.buffer : null;
    
    const result = await this.sessionService.transcribeSession(sessionId, audioBuffer);
    res.status(201).json(result);
  });

  embedSession = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const result = await this.sessionService.embedSession(sessionId);
    res.json(result);
  });

  searchSessions = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q, therapistId } = req.query;
    
    if (!q || typeof q !== 'string') {
      throw new AppError('Query parameter "q" is required', 400);
    }

    const therapistIdStr = therapistId && typeof therapistId === 'string' ? therapistId : undefined;
    const result = await this.sessionService.searchSessions(q, therapistIdStr);
    res.json(result);
  });
}
