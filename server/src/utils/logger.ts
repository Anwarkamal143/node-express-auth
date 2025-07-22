import { APP_CONFIG } from '@/config/app.config';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
const { colorize, timestamp, printf, combine, align, errors, json } = format;
APP_CONFIG;
const IS_PRODUCTION = APP_CONFIG.NODE_ENV === 'production';
// Define log format
const transportsArray: (typeof transports.Console | DailyRotateFile)[] = [];
if (!IS_PRODUCTION) {
  transportsArray.push(
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
        })
      ),
    })
  );
}
transportsArray.push(
  new DailyRotateFile({
    dirname: 'logs',
    filename: '%DATE%-app.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
  })
);
const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json(),
  printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);
// Create logger instance
export const logger = createLogger({
  level: IS_PRODUCTION ? 'info' : 'debug',
  format: logFormat,
  transports: transportsArray,
  // transports: [
  //   new transports.Console(),
  //   new DailyRotateFile({
  //     dirname: 'logs',
  //     filename: '%DATE%-app.log',
  //     datePattern: 'YYYY-MM-DD',
  //     maxSize: '20m',
  //     maxFiles: '14d',
  //   }),
  // ],
});
// const logFormat = format.combine(
//   format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//   format.printf(({ level, message, timestamp }) => {
//     return `${timestamp} [${level.toUpperCase()}]: ${message}`;
//   })
// );
