// import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
// import { ErrorCode } from '@/enums/error-code.enum';
// import { Request, Response } from 'express';
// import AppError from './app-error';
// import { hashValue } from './bcrypt';
// import { toUTC } from './date-time';

// type IResponseType = {
//   message: String;
//   data?: any;
//   success?: true | false;
//   statusCode?: HttpStatusCode;
//   status?: 'success' | 'fail' | 'error';
//   errorCode?: ErrorCode;
//   [Key: string]: any;
// };
// export const SuccessResponse = (res: Response, props: IResponseType) => {
//   const {
//     message = '',
//     data,
//     success = true,
//     statusCode = 200,
//     status = 'success',
//     ...rest
//   } = props;
//   return res.status(statusCode).json({
//     message,
//     success,
//     data,
//     status,
//     time: toUTC(new Date()),
//     ...rest,
//   });
// };

// export const ErrorResponse = (
//   message: string,
//   statusCode: HttpStatusCode,
//   errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
// ) => {
//   return new AppError(message, statusCode, errorCode);
// };
// export const getFingerPrint = async (req: Request) => {
//   return await hashValue(`${req.ip}-${req.headers['user-agent']}`);
// };
import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { Request, Response } from 'express';
import AppError from './app-error';
import { hashValue } from './bcrypt';
import { toUTC } from './date-time';

interface SuccessResponseProps {
  message: string;
  data?: unknown;
  success?: boolean;
  statusCode?: HttpStatusCode;
  status?: 'success' | 'fail' | 'error';
  errorCode?: ErrorCode;
  [key: string]: unknown;
}

interface ErrorResponseOptions {
  errorCode?: ErrorCode;
  metadata?: Record<string, unknown>;
  isOperational?: boolean;
  cause?: Error;
}

interface FingerprintOptions {
  includeHeaders?: string[];
  saltRounds?: number;
}

export class ResponseUtils {
  /**
   * Standard success response formatter
   * @param res Express Response object
   * @param props Response properties
   */
  static success(res: Response, props: SuccessResponseProps): Response {
    const {
      message = '',
      data,
      success = true,
      statusCode = HTTPSTATUS.OK,
      status = 'success',
      ...rest
    } = props;

    return res.status(statusCode).json({
      message,
      success,
      data,
      status,
      timestamp: toUTC(new Date()),
      ...rest,
    });
  }

  /**
   * Standard error response creator
   * @param message Error message
   * @param statusCode HTTP status code
   * @param options Additional error options
   */
  static error(
    message: string,
    statusCode: HttpStatusCode,
    options?: ErrorResponseOptions
  ): AppError {
    return new AppError(
      message,
      statusCode,
      options?.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      {
        metadata: options?.metadata,
        isOperational: options?.isOperational ?? true,
        cause: options?.cause,
      }
    );
  }

  /**
   * Generates a fingerprint hash for request identification
   * @param req Express Request object
   * @param options Fingerprint generation options
   */
  static async getFingerprint(req: Request, options: FingerprintOptions = {}): Promise<string> {
    const headersToInclude = options.includeHeaders || ['user-agent'];
    const headerValues = headersToInclude
      .map((header) => req.headers[header.toLowerCase()] || '')
      .join('-');

    const fingerprintString = `${req.ip}-${headerValues}`;
    return hashValue(fingerprintString, options.saltRounds);
  }

  /**
   * Empty success response for operations with no return data
   * @param res Express Response object
   * @param message Success message
   */
  static noContent(res: Response, message = 'Operation successful'): Response {
    return res.status(HTTPSTATUS.NO_CONTENT).json({
      message,
      success: true,
      status: 'success',
      timestamp: toUTC(new Date()),
    });
  }
}

// Legacy exports for backward compatibility
export const SuccessResponse = ResponseUtils.success;
export const ErrorResponse = ResponseUtils.error;
export const getFingerPrint = ResponseUtils.getFingerprint;
