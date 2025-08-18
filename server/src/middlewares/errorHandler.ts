import IoRedis from '@/app-redis';
import { APP_CONFIG } from '@/config/app.config';
import { closeDbConnection } from '@/db';
import { ErrorCode } from '@/enums/error-code.enum';
import socket from '@/socket';
import AppError from '@/utils/app-error';
import { toUTC } from '@/utils/date-time';
import { logger } from '@/utils/logger';
import { SuccessResponse } from '@/utils/requestResponse';
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import * as Http from 'http';
import { z } from 'zod';
import { HTTPSTATUS, HttpStatusCode } from '../config/http.config';

let httpServerRef: Http.Server;

interface ErrorMetrics {
  errorName: string;
  errorCode?: ErrorCode;
  statusCode?: number;
  path?: string;
}

interface ErrorHandlerConfig {
  shutdownTimeout?: number;
  gracefulShutdown?: boolean;
}

export class ErrorHandler {
  private static config: ErrorHandlerConfig = {
    shutdownTimeout: 10000,
    gracefulShutdown: true,
  };

  static initialize(httpServer: Http.Server, config?: Partial<ErrorHandlerConfig>) {
    httpServerRef = httpServer;
    this.config = { ...this.config, ...config };

    process.on('uncaughtException', async (error) => {
      await this.handleError(error);
    });

    process.on('unhandledRejection', async (reason) => {
      await this.handleError(reason);
    });

    process.on('SIGTERM', async () => {
      logger.error('App received SIGTERM event, try to gracefully close the server');
      await this.terminateHttpServerAndExit();
    });

    process.on('SIGINT', async () => {
      logger.error('App received SIGINT event, try to gracefully close the server');
      await this.terminateHttpServerAndExit();
    });
  }

  static async handleError(errorToHandle: unknown): Promise<number> {
    try {
      const appError = this.covertUnknownToAppError(errorToHandle);
      logger.error(appError.message, appError);

      this.fireMetrics({
        errorName: appError.name,
        errorCode: appError.errorCode,
        statusCode: appError.statusCode,
      });

      return appError.statusCode;
    } catch (handlingError: unknown) {
      process.stdout.write('Error handler failed:\n');
      process.stdout.write(JSON.stringify(handlingError, null, 2));
      process.stdout.write('\nOriginal error:\n');
      process.stdout.write(JSON.stringify(errorToHandle, null, 2));
      return HTTPSTATUS.INTERNAL_SERVER_ERROR;
    }
  }

  private static async terminateHttpServerAndExit(): Promise<void> {
    try {
      if (!httpServerRef) {
        logger.warn('Server SHUTDOWN: No HTTP server reference found');
        process.exit(0);
        return;
      }

      const shutdownPromises: Promise<void>[] = [
        new Promise((resolve) => {
          httpServerRef.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        }),
        closeDbConnection(),
        socket.disconnect(),
        IoRedis.close(),
      ];

      if (this.config.gracefulShutdown) {
        await Promise.race([
          Promise.all(shutdownPromises),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout')), this.config.shutdownTimeout)
          ),
        ]);
      }

      logger.warn(`Server SHUTDOWN: ${toUTC(new Date())}`);
      process.exit(0);
    } catch (error) {
      logger.error('Error during server SHUTDOWN:', error);
      process.exit(1);
    }
  }

  private static covertUnknownToAppError(errorToHandle: unknown): AppError {
    if (errorToHandle instanceof AppError) {
      return errorToHandle;
    }

    const errorObj = this.normalizeErrorObject(errorToHandle);
    const stackTrace = errorObj.stack || new Error().stack;

    const appError = new AppError(
      errorObj.message || 'Unknown error occurred',
      (errorObj.statusCode || HTTPSTATUS.INTERNAL_SERVER_ERROR) as HttpStatusCode,
      errorObj.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      {
        cause: errorObj.cause,
        metadata: errorObj.metadata,
      }
    );

    if (stackTrace) {
      appError.stack = stackTrace;
    }

    return appError;
  }

  private static normalizeErrorObject(error: unknown): {
    message?: string;
    statusCode?: number;
    errorCode?: ErrorCode;
    stack?: string;
    cause?: Error;
    metadata?: Record<string, unknown>;
  } {
    if (typeof error !== 'object' || error === null) {
      return { message: String(error) };
    }

    const errorProperties = [
      'message',
      'statusCode',
      'errorCode',
      'stack',
      'cause',
      'metadata',
      'reason',
      'description',
      'HTTPStatus',
      'code',
    ];

    const result: Record<string, any> = {};
    for (const prop of errorProperties) {
      if (prop in error) {
        result[prop] = (error as Record<string, any>)[prop];
      }
    }

    if (error instanceof z.ZodError) {
      return {
        message: 'Validation failed',
        statusCode: HTTPSTATUS.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        metadata: { validationErrors: error.issues },
      };
    }

    return result;
  }

  private static fireMetrics(metrics: ErrorMetrics): void {
    logger.info(`Firing metric for error: ${JSON.stringify(metrics)}`);
  }

  static handleZodError(res: Response, error: z.ZodError, path: string): void {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    SuccessResponse(res, {
      statusCode: HTTPSTATUS.BAD_REQUEST,
      status: 'fail',
      success: false,
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation Failed',
      errors,
      path,
    });
  }

  static sendDevelopmentError(error: AppError, res: Response, path: string): void {
    SuccessResponse(res, {
      statusCode: error.statusCode,
      success: false,
      code: error.errorCode,
      status: error.status,
      message: error.message,
      ...((error.metadata?.validationErrors as any) && {
        errors: error.metadata.validationErrors,
      }),
      name: error.name,
      path,
      stack: error.stack,
      metadata: error.metadata,
      cause: error.cause?.message,
    });
  }

  static sendProductionError(error: AppError, res: Response, path: string): void {
    if (error.isOperational) {
      SuccessResponse(res, {
        statusCode: error.statusCode,
        success: false,
        code: error.errorCode,
        status: error.status,
        message: error.message,
        ...((error.metadata?.validationErrors as any) && {
          errors: error.metadata.validationErrors,
        }),
        path,
      });
    } else {
      logger.error('Unexpected error:', error);
      SuccessResponse(res, {
        statusCode: HTTPSTATUS.INTERNAL_SERVER_ERROR,
        status: 'error',
        success: false,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong!',
        path,
      });
    }
  }

  static getMiddleware(): ErrorRequestHandler {
    const middleware: ErrorRequestHandler = (
      error: unknown,
      req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      logger.error(`Error occurred on PATH: ${req.path}`, error);

      const appError = this.covertUnknownToAppError(error);

      if (error instanceof z.ZodError) {
        this.handleZodError(res, error, req.path);
        return;
      }

      if (APP_CONFIG.NODE_ENV === 'development') {
        this.sendDevelopmentError(appError, res, req.path);
        return;
      }

      this.sendProductionError(appError, res, req.path);
    };

    return middleware;
  }
}

export const initializeErrorHandler = (httpServer: Http.Server) => {
  ErrorHandler.initialize(httpServer);
};

export const errorHandler = ErrorHandler.getMiddleware();
