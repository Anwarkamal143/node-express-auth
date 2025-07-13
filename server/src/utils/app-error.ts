import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';

export default class AppError extends Error {
  status: string;
  isOperational: boolean;

  constructor(
    public message: string,
    public statusCode: HttpStatusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    public errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    public errors?: any
    // public name?: string,
    // public isCatastrophic = false,
  ) {
    //   message the only parameter Error built in accepts
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
