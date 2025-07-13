import { APP_CONFIG } from '@/config/app.config';
import { logger } from '@/utils/logger';
import { createRedisKey } from '@/utils/redis';
import Redis, { Callback, Cluster, RedisKey } from 'ioredis';

class IoRedis extends Redis {
  private static _redis: Redis | Cluster;

  constructor() {
    // if (APP_CONFIG.REDIS_MODE === 'sentinel' && APP_CONFIG.REDIS_SENTINELS) {
    //   super({
    //     sentinels: APP_CONFIG.REDIS_SENTINELS,
    //     name: APP_CONFIG.REDIS_SENTINEL_NAME,
    //     password: APP_CONFIG.REDIS_PASSWORD,
    //     retryStrategy(times) {
    //       const delay = Math.min(times * 100, 3000);
    //       logger.warn(`Retrying Redis Sentinel connection in ${delay}ms`);
    //       return delay;
    //     },
    //     reconnectOnError(err) {
    //       const targetErrors = ['READONLY', 'ETIMEDOUT'];
    //       const shouldReconnect = targetErrors.some((msg) => err.message.includes(msg));
    //       if (shouldReconnect) logger.warn('Sentinel reconnecting due to Redis error:', err);
    //       return shouldReconnect;
    //     },
    //   });
    // } else
    // if (APP_CONFIG.REDIS_CLUSTER && Array.isArray(APP_CONFIG.REDIS_CLUSTER_NODES)) {
    //   super.Cluster(APP_CONFIG.REDIS_CLUSTER_NODES, {
    //     redisOptions: {
    //       password: APP_CONFIG.REDIS_PASSWORD,
    //       retryStrategy(times) {
    //         const delay = Math.min(times * 100, 3000);
    //         logger.warn(`Retrying Redis cluster connection in ${delay}ms`);
    //         return delay;
    //       },
    //       reconnectOnError(err) {
    //         const targetErrors = ['READONLY', 'ETIMEDOUT'];
    //         const shouldReconnect = targetErrors.some((msg) => err.message.includes(msg));
    //         if (shouldReconnect) logger.warn('Cluster reconnecting due to Redis error:', err);
    //         return shouldReconnect;
    //       },
    //     },
    //   });
    // } else
    // {
    super({
      port: APP_CONFIG.REDIS_PORT,
      host: APP_CONFIG.REDIS_HOST,
      password: APP_CONFIG.REDIS_PASSWORD,

      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Retrying Redis connection in ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ETIMEDOUT'];
        const shouldReconnect = targetErrors.some((msg) => err.message.includes(msg));
        if (shouldReconnect) logger.warn('Reconnecting due to Redis error:', err);
        return shouldReconnect;
      },
    });
    // }
  }

  public static connect() {
    if (!this.redis) {
      try {
        this.redis = this.getNewInstance();

        this.redis.on('connect', () => {
          logger.info('Redis connected');
        });

        this.redis.on('error', (err) => {
          logger.error('Redis error:', err);
        });

        this.redis.on('reconnecting', () => {
          logger.warn('Redis reconnecting...');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
          logger.info('Closing Redis connection...');
          await this.redis.quit();
          process.exit(0);
        });
      } catch (error) {
        logger.error('Failed to connect Redis:', error);
      }
    }
    return this.redis;
  }

  public static async setValue(
    key: string,
    value: string | Buffer | number,
    ttlInSeconds?: number,
    callback?: Callback<'OK'>
  ) {
    try {
      const redisKey = createRedisKey(key);
      if (ttlInSeconds) {
        return await this.redis.set(redisKey, value, 'EX', ttlInSeconds, callback);
      }
      return await this.redis.set(redisKey, value, callback);
    } catch (err) {
      logger.error('Redis setValue error:', err);
      return null;
    }
  }

  public static async setJson(key: string, value: object, ttlInSeconds?: number) {
    return this.setValue(key, JSON.stringify(value), ttlInSeconds);
  }

  public static async getValue(key: RedisKey, callback?: Callback<string | null>) {
    try {
      return await this.redis.get(createRedisKey(key as string), callback);
    } catch (err) {
      logger.error('Redis getValue error:', err);
      return null;
    }
  }

  public static async getJson<T = any>(key: string): Promise<T | null> {
    const value = await this.getValue(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (err) {
      logger.error('Failed to parse JSON from Redis:', err);
      return null;
    }
  }

  public static async delValue(key: RedisKey) {
    try {
      return await this.redis.del(createRedisKey(key as string));
    } catch (err) {
      logger.error('Redis delValue error:', err);
      return null;
    }
  }

  public static async exists(key: string) {
    try {
      return await this.redis.exists(createRedisKey(key));
    } catch (err) {
      logger.error('Redis exists check error:', err);
      return 0;
    }
  }

  public static async keys(pattern: string) {
    try {
      return await this.redis.keys(pattern);
    } catch (err) {
      logger.error('Redis keys fetch error:', err);
      return [];
    }
  }

  public static set redis(redis: Redis | Cluster) {
    this._redis = redis;
  }

  public static get redis() {
    return this._redis;
  }

  public static getNewInstance() {
    return new IoRedis();
  }

  public static getInstance() {
    return IoRedis;
  }

  public static async publish(
    key: string | Buffer,
    message: string | Buffer | object,
    callback?: Callback<number>
  ) {
    try {
      const redis = this.redis;
      const msg =
        typeof message === 'string' || Buffer.isBuffer(message) ? message : JSON.stringify(message);

      if (callback) {
        return await redis.publish(key, msg, callback);
      }
      return await redis.publish(key, msg);
    } catch (err) {
      logger.error('Redis publish error:', err);
      return null;
    }
  }
}

export default IoRedis;
