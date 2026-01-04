import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    [key: string]: any;
  };
}

export class ErrorHandler {
  /**
   * Error handling middleware
   */
  static handle() {
    return (err: Error | AppError, req: Request, res: Response, next: NextFunction): void => {
      // Default error values
      let statusCode = 500;
      let message = 'Internal server error';
      let isOperational = false;
      let details: { [key: string]: any } = {};

      // Handle AppError instances
      if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
      } else if (err instanceof Error) {
        // Handle specific error types
        if (err.name === 'ValidationError') {
          statusCode = 400;
          message = 'Validation error';
          details.validation = err.message;
        } else if (err.name === 'UnauthorizedError') {
          statusCode = 401;
          message = 'Unauthorized';
        } else if (err.name === 'CastError') {
          statusCode = 400;
          message = 'Invalid ID format';
        } else {
          // Generic error - use the message if available
          message = err.message || message;
        }
      }

      // Log error details (in production, use proper logging service)
      const errorDetails = {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        statusCode,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        body: req.body,
        query: req.query,
        params: req.params
      };

      // Log to console (in production, use logger)
      if (statusCode >= 500) {
        console.error('Server Error:', errorDetails);
      } else {
        console.warn('Client Error:', errorDetails);
      }

      // Send error response
      const errorResponse: ErrorResponse = {
        error: {
          message,
          statusCode,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
          ...details
        }
      };

      // Add stack trace in development mode
      if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.error.stack = err.stack;
      }

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Handle 404 Not Found errors
   */
  static notFound() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const error = new AppError(
        `Route ${req.method} ${req.path} not found`,
        404
      );
      next(error);
    };
  }

  /**
   * Handle async errors
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Convert known errors to AppError
   */
  static convertToAppError(err: any): AppError {
    if (err instanceof AppError) {
      return err;
    }

    // Handle common error patterns
    if (err.message?.includes('not found')) {
      return new AppError(err.message, 404);
    }

    if (err.message?.includes('Missing required fields') || 
        err.message?.includes('must be') ||
        err.message?.includes('invalid')) {
      return new AppError(err.message, 400);
    }

    if (err.message?.includes('unauthorized') || 
        err.message?.includes('forbidden')) {
      return new AppError(err.message, 403);
    }

    // Default to 500
    return new AppError(err.message || 'Internal server error', 500, false);
  }
}

