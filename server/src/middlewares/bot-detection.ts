import { HTTPSTATUS } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { HttpException } from '@/utils/catch-errors';
import { NextFunction, Request, Response } from 'express';

const botRegex =
  /bot|crawl|crawler|spider|scraper|slurp|wget|curl|python|python-requests|headless|phantom/i;
export const isBot = (req: Request, _res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'];
  const acceptEncoding = req.headers['accept-encoding'];
  const acceptlanguage = req.headers['accept-language'];

  // Check if the request is from a bot
  const isBot =
    !userAgent ||
    botRegex.test(userAgent.toLowerCase()) ||
    !accept ||
    !acceptEncoding ||
    accept === '*/*' ||
    !acceptlanguage;
  if (isBot) {
    return next(
      new HttpException('Bot detected', HTTPSTATUS.FORBIDDEN, ErrorCode.ACCESS_FORBIDDEN)
    );
  }

  return next();
};
