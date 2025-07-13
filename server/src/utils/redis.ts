import { APP_CONFIG } from '@/config/app.config';

export const createRedisKey = (key: string) => {
  return `${APP_CONFIG.REDIS_PREFIX}_${key}`;
};
