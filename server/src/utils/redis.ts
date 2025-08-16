import IoRedis from '@/app-redis';
import { APP_CONFIG } from '@/config/app.config';
import { parseDurationToSeconds } from './cookie';
export const REDIS_KEYS = {
  REFRESH_TOKEN_JTI: (jti?: string) => createRedisKey('refresh-token-jit' + jti),
};
export const createRedisKey = (key: string) => {
  return `${APP_CONFIG.REDIS_PREFIX}:${key}`;
};
export const getRefreshTokenByJTI = async (jti?: string) => {
  if (!jti) {
    return null;
  }
  const jtires = await IoRedis.redis.get(REDIS_KEYS.REFRESH_TOKEN_JTI(jti));
  if (!jtires) {
    return null;
  }

  return JSON.parse(jtires) as IStoredRefreshToken;
};
export const setRefreshTokenWithJTI = async (jti?: string, text?: IStoredRefreshToken) => {
  if (!jti || !text) {
    return null;
  }
  return await IoRedis.redis.setex(
    REDIS_KEYS.REFRESH_TOKEN_JTI(jti),
    parseDurationToSeconds('7d'),
    JSON.stringify(text)
  );
};
export const deleteRefreshTokenWithJTI = async (jti?: string) => {
  if (!jti) {
    return null;
  }

  return await IoRedis.redis.del(REDIS_KEYS.REFRESH_TOKEN_JTI(jti));
};
