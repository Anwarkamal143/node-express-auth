import { HTTPSTATUS } from '@/config/http.config';
import { ErrorCode } from '@/enums/error-code.enum';
import { HttpException } from '@/utils/catch-errors';
import { NextFunction, Request, Response } from 'express';

// Extended list of bot/crawler identifiers
const BOT_REGEX = new RegExp(
  [
    'bot',
    'crawl',
    'crawler',
    'spider',
    'scraper',
    'slurp',
    'wget',
    'curl',
    'python',
    'python-requests',
    'headless',
    'phantom',
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'slackbot',
    'vkShare',
    'facebot',
    'ia_archiver',
  ].join('|'),
  'i'
);

// Additional bot detection indicators
const BOT_HEADER_INDICATORS = {
  ACCEPT: '*/*',
  CONNECTION: 'keep-alive',
  FROM: 'googlebot(at)googlebot.com',
  VIA: '1.1 vegur',
};

interface BotDetectionOptions {
  strictMode?: boolean;
  allowedBots?: string[];
  logSuspicious?: boolean;
}

export const isBot = (options: BotDetectionOptions = {}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    const headers = {
      accept: req.headers['accept'],
      acceptEncoding: req.headers['accept-encoding'],
      acceptLanguage: req.headers['accept-language'],
      connection: req.headers['connection'],
      from: req.headers['from'],
      via: req.headers['via'],
    };

    // Check for allowed bots first
    if (options.allowedBots && options.allowedBots.some((bot) => userAgent.includes(bot))) {
      return next();
    }

    // Basic bot detection
    const isBasicBot = !userAgent || BOT_REGEX.test(userAgent.toLowerCase());

    // Header-based detection
    const hasBotHeaders =
      headers.accept === BOT_HEADER_INDICATORS.ACCEPT ||
      headers.connection === BOT_HEADER_INDICATORS.CONNECTION ||
      headers.from === BOT_HEADER_INDICATORS.FROM ||
      headers.via === BOT_HEADER_INDICATORS.VIA ||
      !headers.accept ||
      !headers.acceptEncoding ||
      !headers.acceptLanguage;

    // Strict mode checks additional headers
    const isStrictBot = options.strictMode ? hasBotHeaders : isBasicBot || hasBotHeaders;

    if (isStrictBot) {
      if (options.logSuspicious) {
        console.warn('Bot detected:', {
          userAgent,
          headers,
          ip: req.ip,
          path: req.path,
        });
      }
      return next(
        new HttpException(
          'Bot access not allowed',
          HTTPSTATUS.FORBIDDEN,

          {
            errorCode: ErrorCode.ACCESS_FORBIDDEN,
            metadata: {
              detectionMethod: options.strictMode ? 'strict' : 'basic',
              userAgent,
              suspiciousHeaders: headers,
            },
          }
        )
      );
    }

    return next();
  };
};

// Usage examples:
// Basic detection
// app.use(isBot());

// Strict detection with allowed bots
// app.use(isBot({
//   strictMode: true,
//   allowedBots: ['Googlebot', 'Bingbot'],
//   logSuspicious: true
// }));
