import { HttpStatusCode } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { Request, Response } from 'express';
import AppError from './app-error';
import { hashValue } from './bcrypt';
import { toUTC } from './date-time';

type IResponseType = {
  message: String;
  data?: any;
  success?: true | false;
  statusCode?: HttpStatusCode;
  status?: 'success' | 'fail' | 'error';
  errorCode?: ErrorCode;
  [Key: string]: any;
};
export const SuccessResponse = (res: Response, props: IResponseType) => {
  const {
    message = '',
    data,
    success = true,
    statusCode = 200,
    status = 'success',
    ...rest
  } = props;
  return res.status(statusCode).json({
    message,
    success,
    data,
    status,
    time: toUTC(new Date()),
    ...rest,
  });
};

export const ErrorResponse = (
  message: string,
  statusCode: HttpStatusCode,
  errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
) => {
  return new AppError(message, statusCode, errorCode);
};
export const getFingerPrint = async (req: Request) => {
  return await hashValue(`${req.ip}-${req.headers['user-agent']}`);
};
