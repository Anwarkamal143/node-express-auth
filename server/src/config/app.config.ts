import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    path: '.example.env',
  });
} else {
  dotenv.config();
}

import { stringToNumber } from '@/utils';

export const APP_CONFIG = {
  BASE_API_PATH: '/api/v1',
  DB_URL: process.env.DB_URL || '',
  PORT: stringToNumber(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_TLS: process.env.REDIS_TLS === 'true' || false,
  REDIS_USER: process.env.REDIS_USER || 'default',
  REDIS_PORT: stringToNumber(process.env.REDIS_PORT!) || 6379,
  REDIS_PATH: process.env.REDIS_PATH,
  REDIS_PREFIX: process.env.REDIS_PREFIX || 'x',
  JWT_SECRET: process.env.JWT_SECRET || 'xLDL9bqmNO:PI9Q5O`+#GnGFTukFKl',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'AD455xLDL9bqmNO:PIAD&ADF9Q5O`+#GnGFTuk$#(FKl',

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_COOKIE_EXPIRES_IN: stringToNumber(process.env.JWT_COOKIE_EXPIRES_IN) || '15m',
  // JWT_REFRESH_COOKIE_EXPIRES_IN: stringToNumber(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN) || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'x_jwt',
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME || 'refresh_x_jwt',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  HOST_NAME: process.env.HOST_NAME || '',
  AFTER_LOGIN_URL: process.env.APP_URL || '',
  TOKEN_ISSUER: process.env.TOKEN_ISSUER || 'x_back',
  TOKEN_AUDIENCE: process.env.TOKEN_AUDIENCE || 'x_front',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAILER_SENDER: process.env.MAILER_SENDER,
  SOCKET_RATE_LIMIT: stringToNumber(process.env.SOCKET_RATE_LIMIT) || 300,
  WHITELIST_ORIGINS: (process.env.WHITELIST_ORIGINS || []) as (string | undefined)[],
  // REDIS_SENTINELS: process.env.REDIS_SENTINELS,
  // REDIS_SENTINEL_NAME: process.env.REDIS_SENTINEL_NAME,
  // REDIS_MODE: process.env.REDIS_MODE,
  // REDIS_CLUSTER: process.env.REDIS_CLUSTER,
  // REDIS_CLUSTER_NODES: process.env.REDIS_CLUSTER_NODES,
};
