import { CookieOptions, Response } from 'express';

import IoRedis from '@/app-redis';
import { APP_CONFIG } from '@/config/app.config';
import { generateJti } from '.';
import { jwtSignToken } from './jwt';
import { createRedisKey } from './redis';
/**
 * Parses duration string like "15m", "7d", "2h" into minutes.
 * @param duration - Duration string (e.g., "15m", "2h", "7d")
 * @returns duration in minutes
 */
export function parseExpiryDuration(duration: string): number {
  const regex = /^(\d+)([mhd])$/i;
  const match = duration.match(regex);

  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Use formats like "15m", "2h", "7d".`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'm':
      return value;
    case 'h':
      return value * 60;
    case 'd':
      return value * 24 * 60;
    default:
      throw new Error(`Unsupported time unit: "${unit}"`);
  }
}

// export const getCookieTime = (expiresIn: number = 1) => {
//   const expireIn = expiresIn * 24 * 60 + 2;
//   return new Date(Date.now() + expireIn * 60 * 1000);
// };

/**
 * Converts a duration string or number into seconds.
 *
 * Supports units: seconds (`s`, `sec`, `seconds`, etc.),
 * minutes (`m`, `min`, `minutes`, etc.),
 * hours (`h`, `hr`, `hours`, etc.),
 * and days (`d`, `day`, `days`).
 *
 * @param input - The duration to convert (e.g., "15m", "2 hours", 10)
 * @returns number - The duration in seconds
 */
export const parseDurationToSeconds = (input: string | number): number => {
  // If a number is passed directly, assume it's minutes
  if (typeof input === 'number') {
    return input * 60;
  }

  const trimmed = input.trim().toLowerCase();

  // Regex to match duration strings with various units
  const regex =
    /^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i;

  const match = trimmed.match(regex);

  if (!match) {
    throw new Error(
      `Invalid duration format: "${input}". Try "15m", "2 hours", "1.5 days", "30s", etc.`
    );
  }

  const value = parseFloat(match[1]); // Numeric portion
  const unit = match[2]; // Time unit

  switch (unit) {
    // Seconds
    case 's':
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
      return Math.floor(value);

    // Minutes
    case 'm':
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      return Math.floor(value * 60);

    // Hours
    case 'h':
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      return Math.floor(value * 60 * 60);

    // Days
    case 'd':
    case 'day':
    case 'days':
      return Math.floor(value * 24 * 60 * 60);

    default:
      throw new Error(`Unknown time unit: "${unit}"`);
  }
};

export const getCookieTime = (expiresIn: string | number = '1d') => {
  const minutes = typeof expiresIn === 'string' ? parseExpiryDuration(expiresIn) : expiresIn;

  return new Date(Date.now() + minutes * 60 * 1000);
};

export const getCookiesOptions = (props?: {
  cookies?: Record<string, any>;
  expiresIn?: string | number;
}) => {
  const { cookies, expiresIn = APP_CONFIG.JWT_COOKIE_EXPIRES_IN } = props || {
    expiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
    cookies: {},
  };
  const updatedCookies = { ...cookies };
  updatedCookies.expires = updatedCookies.expires || getCookieTime(expiresIn);
  updatedCookies.httpOnly = updatedCookies.httpOnly || true;
  updatedCookies.sameSite = updatedCookies.sameSite || 'lax';
  updatedCookies.path = updatedCookies.path || '/';

  if (process.env.NODE_ENV === 'production') {
    updatedCookies.secure = true;
  }

  return updatedCookies;
};

export const resetCookies = (res: Response) => {
  const expires = new Date(Date.now() - 2 * 60 * 1000);
  res.cookie(APP_CONFIG.COOKIE_NAME, '', {
    ...getCookiesOptions({
      cookies: { expires },
    }),
    maxAge: 0,
  });
  res.cookie(APP_CONFIG.REFRESH_COOKIE_NAME, '', {
    ...getCookiesOptions({
      cookies: { expires },
    }),
    maxAge: 0,
  });
};
export const createToken = async (tokenData: { id: string; [key: string]: any }) => {
  const token = await jwtSignToken({ ...tokenData, expiresIn: APP_CONFIG.JWT_EXPIRES_IN });

  const token_attributes: CookieOptions = getCookiesOptions({
    expiresIn: APP_CONFIG.JWT_COOKIE_EXPIRES_IN,
  });
  const refresh_attributes: CookieOptions = getCookiesOptions({
    expiresIn: APP_CONFIG.JWT_REFRESH_COOKIE_EXPIRES_IN,
  });
  const jti = generateJti();
  const refreshToken = await jwtSignToken({
    ...{ ...tokenData, jti },
    expiresIn: APP_CONFIG.JWT_REFRESH_EXPIRES_IN,
  });
  IoRedis.redis.setex(
    createRedisKey('refresh-jti' + jti),
    parseDurationToSeconds('7d'),
    refreshToken
  );
  return {
    accessToken: token,
    refresh_attributes,
    refreshToken,
    token_attributes,
    jti,
  };
};
export const setCookies = async (
  res: Response,
  tokenData: { id: string } & Record<string, any>
) => {
  const { token_attributes, accessToken, refreshToken, refresh_attributes } =
    await createToken(tokenData);
  res.cookie(APP_CONFIG.COOKIE_NAME, accessToken, token_attributes);
  res.cookie(APP_CONFIG.REFRESH_COOKIE_NAME, refreshToken, refresh_attributes);
  return { accessToken, refreshToken };
};
