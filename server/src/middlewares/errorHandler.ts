import IoRedis from '@/app-redis';
import { APP_CONFIG } from '@/config/app.config';
import { closeDbConnection } from '@/db';
import { ErrorCode } from '@/enums/error-code.enum';
import socket from '@/socket';
import AppError from '@/utils/app-error';
import { toUTC } from '@/utils/date-time';
import { logger } from '@/utils/logger';
import { SuccessResponse } from '@/utils/requestResponse';
import { ErrorRequestHandler, Response } from 'express';
import * as Http from 'http';
import { z } from 'zod';
import { HTTPSTATUS } from '../config/http.config';
let httpServerRef: Http.Server;

export const listenToErrorEvents = (httpServer: Http.Server) => {
  httpServerRef = httpServer;
  process.on('uncaughtException', async (error) => {
    await handleError(error);
  });

  process.on('unhandledRejection', async (reason) => {
    await handleError(reason);
  });

  process.on('SIGTERM', async () => {
    logger.error('App received SIGTERM event, try to gracefully close the server');
    await terminateHttpServerAndExit();
  });

  process.on('SIGINT', async () => {
    logger.error('App received SIGINT event, try to gracefully close the server');
    await terminateHttpServerAndExit();
  });
};

export const handleError = async (errorToHandle: unknown) => {
  try {
    logger.info('Handling error1');
    const appError: AppError = covertUnknownToAppError(errorToHandle);
    logger.error(appError.message, appError);
    metricsExporter.fireMetric('error', { errorName: appError.name }); // fire any custom metric when handling error
    // A common best practice is to crash when an unknown error (catastrophic) is being thrown
    // if (appError.isCatastrophic) {
    //   terminateHttpServerAndExit();
    // }
    return appError.statusCode;
  } catch (handlingError: unknown) {
    // Not using the logger here because it might have failed
    process.stdout.write(
      'The error handler failed, here are the handler failure and then the origin error that it tried to handle'
    );
    process.stdout.write(JSON.stringify(handlingError));
    process.stdout.write(JSON.stringify(errorToHandle));
    return 500;
  }
};

const terminateHttpServerAndExit = async () => {
  // TODO: implement more complex logic here (like using 'http-terminator' library)
  try {
    if (httpServerRef) {
      httpServerRef.close();
      await closeDbConnection();
      await socket.disconnect();
      await IoRedis.close();
    }
    logger.warn('Server SHUTDOWN: ' + toUTC(new Date()));
    process.exit(0);
  } catch (error) {
    logger.error('Error during Sever SHUTDOWN:', error);
    process.exit(1);
  }
};

// Responsible to get all sort of crazy error objects including none error objects and
// return the best standard AppError object
export function covertUnknownToAppError(errorToHandle: unknown): AppError {
  if (errorToHandle instanceof AppError) {
    // This means the error was thrown by our code and contains all the necessary information
    return errorToHandle;
  }
  const errorToEnrich: object = getObjectIfNotAlreadyObject(errorToHandle);
  const message = getOneOfTheseProperties(
    errorToEnrich,
    ['message', 'reason', 'description'],
    'Unknown error'
  );
  // const _name = getOneOfTheseProperties(
  //   errorToEnrich,
  //   ['name', 'code'],
  //   'unknown-error'
  // );
  const httpStatusCode = getOneOfTheseProperties(errorToEnrich, ['HTTPStatus', 'statusCode'], 500);
  // const httpStatus = getOneOfTheseProperties(errorToEnrich, ['status'], 'fail');
  const errorCode = getOneOfTheseProperties(
    errorToEnrich,
    ['errorCode'],
    ErrorCode.INTERNAL_SERVER_ERROR
  );
  // const isCatastrophic = getOneOfTheseProperties<boolean>(
  //   errorToEnrich,
  //   ['isCatastrophic', 'catastrophic'],
  //   true
  // );

  const stackTrace = getOneOfTheseProperties<string | undefined>(
    errorToEnrich,
    ['stack'],
    undefined
  );
  const standardError = new AppError(message, httpStatusCode, errorCode);
  standardError.stack = stackTrace;
  const standardErrorWithOriginProperties = Object.assign(standardError, errorToEnrich);

  return standardErrorWithOriginProperties;
}

const getOneOfTheseProperties = <ReturnType>(
  object: Record<string, any>,
  possibleExistingProperties: string[],
  defaultValue: ReturnType
): ReturnType => {
  // eslint-disable-next-line no-restricted-syntax
  for (const property of possibleExistingProperties) {
    if (property in object) {
      return object[property];
    }
  }
  return defaultValue;
};
// This simulates a typical monitoring solution that allow firing custom metrics when
// like Prometheus, DataDog, CloudWatch, etc
const metricsExporter = {
  fireMetric: async (name: string, labels: object) => {
    // 'In real production code I will really fire metrics'
    logger.info(`Firing metric ${name} with labels ${JSON.stringify(labels)}`);
  },
};
function getObjectIfNotAlreadyObject(target: unknown): object {
  if (typeof target === 'object' && target !== null) {
    return target;
  }

  return {};
}
const formatZodError = (res: Response, error: z.ZodError, path: string) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return SuccessResponse(res, {
    statusCode: HTTPSTATUS.BAD_REQUEST,
    status: 'fail',
    success: false,
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Validation Failed',
    errors: errors,
    path: path,
  });
};

const sendErrorDev = (err: Record<string, any>, res: Response, path: string) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    succes: false,
    message: err.message,
    stack: err.stack,
    time: toUTC(new Date()),
    path,
    errors: (err as any).errors,
    code: err.errorCode,
  });
};
function sendErrorProd(err: Record<string, any>, res: Response, path: string) {
  // OPerational ,tursted error, send to client
  // like client send invalid data or like that.
  if (err.isOperational) {
    SuccessResponse(res, {
      statusCode: err.statusCode,
      success: false,
      code: err.errorCode,
      status: err.status || 'fail',
      message: err.message || 'Something went wrong!',
      errors: err.errors,
      path,
    });
    // programming or other unknown error: don't want to leak error details
  } else {
    // 1) Log error
    console.error('ERROR', err);
    // 2) Send generic message

    SuccessResponse(res, {
      statusCode: 500,
      status: 'error',
      success: false,
      code: err.errorCode,
      message: 'Something went wrong!',
      errors: err.errors,
      path,
    });
  }
}
export const errorHandler: ErrorRequestHandler = (error, req, res, _n) => {
  console.error(`Error occured on PATH: ${req.path}`, error);
  if (error instanceof SyntaxError) {
    SuccessResponse(res, {
      statusCode: HTTPSTATUS.BAD_REQUEST,
      status: 'error',
      success: false,
      code: ErrorCode.BAD_REQUEST,
      message: 'Syntax error in request body',
      errors: (error as any).errors,
      path: req.path,
    });
  }
  if (error instanceof z.ZodError) {
    formatZodError(res, error, req.path);
  }

  if (APP_CONFIG.NODE_ENV === 'developmentt') {
    sendErrorDev(error, res, req.path);
    // } else if (process.env.NODE_ENV === 'production') {
  } else {
    sendErrorProd(error, res, req.path);
  }
};
