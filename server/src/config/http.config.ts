import { ErrorCode } from '@/enums/error-code.enum';

const httpConfig = () => ({
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  INSUFFICIENT_STORAGE: 507,
});

export const HTTPSTATUS = httpConfig();
export type HttpStatusCode = (typeof HTTPSTATUS)[keyof typeof HTTPSTATUS];

export const ErrorCodeToHttpStatusMap: Record<ErrorCode, HttpStatusCode> = {
  // Auth
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: HTTPSTATUS.CONFLICT,
  [ErrorCode.AUTH_INVALID_TOKEN]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_USER_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.AUTH_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.AUTH_TOO_MANY_ATTEMPTS]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.AUTH_UNAUTHORIZED_ACCESS]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_TOKEN_NOT_FOUND]: HTTPSTATUS.UNAUTHORIZED,

  // Access
  [ErrorCode.ACCESS_FORBIDDEN]: HTTPSTATUS.FORBIDDEN,
  [ErrorCode.ACCESS_UNAUTHORIZED]: HTTPSTATUS.UNAUTHORIZED,

  // Validation and Resources
  [ErrorCode.VALIDATION_ERROR]: HTTPSTATUS.UNPROCESSABLE_ENTITY,
  [ErrorCode.RESOURCE_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.BAD_REQUEST]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: HTTPSTATUS.UNSUPPORTED_MEDIA_TYPE,
  [ErrorCode.NOT_ACCEPTABLE]: HTTPSTATUS.NOT_ACCEPTABLE,

  // Conflict & Gone
  [ErrorCode.RESOURCE_CONFLICT]: HTTPSTATUS.CONFLICT,
  [ErrorCode.RESOURCE_GONE]: HTTPSTATUS.GONE,

  // Timeout / Rate Limiting
  [ErrorCode.TOO_MANY_REQUESTS]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.REQUEST_TIMEOUT]: HTTPSTATUS.REQUEST_TIMEOUT,

  // Method errors
  [ErrorCode.METHOD_NOT_ALLOWED]: HTTPSTATUS.METHOD_NOT_ALLOWED,

  // Server Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: HTTPSTATUS.SERVICE_UNAVAILABLE,
  [ErrorCode.GATEWAY_TIMEOUT]: HTTPSTATUS.GATEWAY_TIMEOUT,
  [ErrorCode.STORAGE_LIMIT_EXCEEDED]: HTTPSTATUS.INSUFFICIENT_STORAGE,
  [ErrorCode.VERIFICATION_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.NOT_IMPLEMENTED]: HTTPSTATUS.NOT_IMPLEMENTED,
  [ErrorCode.BAD_GATEWAY]: HTTPSTATUS.BAD_GATEWAY,
};
// Reverse mapping
export const HttpStatusToErrorCodeMap: Partial<Record<HttpStatusCode, ErrorCode[]>> =
  Object.entries(ErrorCodeToHttpStatusMap).reduce(
    (acc, [errorCode, statusCode]) => {
      if (!acc[statusCode]) acc[statusCode] = [];
      acc[statusCode]!.push(errorCode as ErrorCode);
      return acc;
    },
    {} as Partial<Record<HttpStatusCode, ErrorCode[]>>
  );

export const getHttpStatusFromErrorCode = (code: ErrorCode): HttpStatusCode => {
  return ErrorCodeToHttpStatusMap[code];
};

export const getErrorCodesFromHttpStatus = (status: HttpStatusCode): ErrorCode[] | undefined => {
  return HttpStatusToErrorCodeMap[status];
};
