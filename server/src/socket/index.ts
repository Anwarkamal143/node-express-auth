import IoRedis from '@/app-redis';
import { APP_CONFIG } from '@/config/app.config';
import { toUTC } from '@/utils/date-time';
import { verifyJwt } from '@/utils/jwt';
import { logger } from '@/utils/logger';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as HttpServer } from 'http';
import CircuitBreaker from 'opossum';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Server, Socket } from 'socket.io';

/**
 * Environment variable configuration with defaults
 */
const config = {
  CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || '*',
  MAX_EVENTS_PER_MINUTE: APP_CONFIG.SOCKET_RATE_LIMIT || 300,
  // HEARTBEAT_INTERVAL: 30000,
  HEARTBEAT_INTERVAL: 10000,
  MAX_MISSED_HEARTBEATS: 3,
  REDIS_SOCKET_KEY_PREFIX: 'sockets',
  NODE_ENV: APP_CONFIG.NODE_ENV,
  //   ALLOWED_NAMESPACES: (process.env.SOCKET_ALLOWED_NAMESPACES || '/default,/chat,/admin').split(','),
  //   IP_WHITELIST: (process.env.SOCKET_IP_WHITELIST || '').split(',').filter(Boolean),
};

/**
 * Custom extended Socket.IO Socket type with additional properties
 */
type ISocket = Socket & {
  user?: IServerCookieType | null;
  ipAddress?: string;
  connectTime?: number;
};

/**
 * Rate limiter instance
 */

/**
 * Redis circuit breaker configuration
 */
const redisCircuitBreaker = new CircuitBreaker(
  async (fn: Function, ...args: any[]) => {
    return fn(...args);
  },
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
);

redisCircuitBreaker.fallback(() => {
  logger.error('Redis circuit breaker opened - using fallback');
  return null;
});

/**
 * Enhanced RedisSocket class with production improvements
 */
class RedisSocket {
  private _io!: Server;
  // private socket!: ISocket;
  private metrics = {
    connections: 0,
    disconnections: 0,
    rateLimited: 0,
    errors: 0,
  };
  private rateLimiter = new RateLimiterRedis({
    storeClient: IoRedis.connect(),
    points: config.MAX_EVENTS_PER_MINUTE,
    duration: 60,
    keyPrefix: 'socket_rate_limit',
  });
  public get redis() {
    return IoRedis.redis;
  }

  public get ioredis() {
    return IoRedis;
  }

  public get io() {
    return this._io;
  }

  public set io(io: Server) {
    this._io = io;
  }

  public getkey(key?: string) {
    return `${config.REDIS_SOCKET_KEY_PREFIX}:${key}`;
  }

  /**
   * Safely execute Redis commands with circuit breaker
   */
  private async safeRedisCommand<T>(
    command: (client: typeof IoRedis.redis) => Promise<T>
  ): Promise<T | null> {
    return redisCircuitBreaker.fire(command, this.redis);
  }

  public connect(httpServer?: HttpServer): Server {
    if (!this.io && httpServer) {
      this.io = new Server(httpServer, {
        cors: {
          origin: config.CORS_ORIGIN,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          credentials: config.NODE_ENV === 'production',
        },
        adapter: createAdapter(this.redis),
        serveClient: false,
        pingTimeout: config.HEARTBEAT_INTERVAL * 2,
        pingInterval: config.HEARTBEAT_INTERVAL,
      });

      this.setupConnection(this.io);
      this.setupMonitoring();
    }
    return this.io;
  }

  /**
   * Setup monitoring and metrics collection
   */
  private setupMonitoring() {
    setInterval(() => {
      logger.info('Socket Metrics', {
        metrics: this.metrics,
        connectionsCount: this.io?.engine?.clientsCount || 0,
      });
    }, 60000); // Log metrics every minute
  }

  public authenticate(io: Server) {
    io.use(async (socket: ISocket, next) => {
      try {
        // IP based access control
        socket.ipAddress = (socket.handshake.headers['x-forwarded-for'] ||
          socket.handshake.address) as string;

        // if (
        //   config.IP_WHITELIST.length > 0 &&
        //   !config.IP_WHITELIST.includes(socket.ipAddress as string)
        // ) {
        //   logger.warn(`IP not allowed: ${socket.ipAddress}`);
        //   return next(new Error('IP not allowed'));
        // }

        const token = socket.handshake.auth.token;
        if (!token) {
          this.metrics.errors++;
          socket.disconnect();
          return next(new Error('Authentication error: Token required'));
        }

        const decoded = await verifyJwt(token);
        if (!decoded) {
          this.metrics.errors++;
          return next(new Error('Authentication error: Invalid token'));
        }

        // const namespace = socket.nsp.name;
        // if (!config.ALLOWED_NAMESPACES.includes(namespace)) {
        //   this.metrics.errors++;
        //   return next(new Error(`Namespace not allowed: ${namespace}`));
        // }

        socket.user = decoded?.data;
        socket.connectTime = Date.now();
        next();
      } catch (error) {
        this.metrics.errors++;
        socket.user = null;
        socket.disconnect(true);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }
  private heartBeat(socket: ISocket) {
    let missedHeartbeats = 0;

    // Socket middleware for rate limiting
    socket.use(async (_packet, next) => {
      console.log({ user: socket.user, id: socket.id }, 'Socket userId');
      try {
        await this.rateLimiter.consume(socket.id);
        next();
      } catch (err) {
        this.metrics.rateLimited++;
        console.log(err);
        logger.warn(`Rate limit exceeded for socket: ${socket.id}`);
        socket.emit('error', { message: 'Rate limit exceeded' });
        socket.disconnect(true);
        // this.disconnectUser();
      }
    });

    // Heartbeat handler
    socket.on('pong', () => {
      missedHeartbeats = 0;
    });

    // Heartbeat interval
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        if (missedHeartbeats >= config.MAX_MISSED_HEARTBEATS) {
          logger.warn(`Forcing disconnect due to missed heartbeats: ${socket.id}`);
          this.metrics.errors++;
          socket.disconnect(true);
          return;
        }
        socket.emit('ping');
        missedHeartbeats++;
      }
    }, config.HEARTBEAT_INTERVAL);
    return heartbeat;
  }
  public setupConnection(io: Server) {
    this.authenticate(io);

    io.on('connection', async (socket: ISocket) => {
      if (!socket.user?.id) {
        socket.disconnect(true);
        return;
      }

      this.metrics.connections++;

      try {
        await this.safeRedisCommand((client) =>
          client.sadd(this.getkey(socket.user?.id), socket.id)
        );
      } catch (err) {
        logger.error('Failed to store socket ID in Redis:', err);
        this.metrics.errors++;
      }

      logger.info(`Socket connected: ${socket.id}, User: ${socket.user.id}`, {
        ip: socket.ipAddress,
        namespace: socket.nsp.name,
      });

      // Track missed heartbeats
      const heartbeat = this.heartBeat(socket);
      // Join default rooms
      this.joinDefaultRooms(socket);

      // Disconnection handler
      socket.on('disconnect', async (reason) => {
        clearInterval(heartbeat);
        this.metrics.disconnections++;

        try {
          await this.safeRedisCommand((client) =>
            client.srem(this.getkey(socket.user?.id), socket.id)
          );
        } catch (err) {
          logger.error('Failed to remove socket ID from Redis:', err);
          this.metrics.errors++;
        }

        logger.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`, {
          userId: socket.user?.id,
          duration: socket.connectTime ? Date.now() - socket.connectTime : 0,
        });

        socket.user = null;
      });

      // Error handler
      socket.on('error', (err) => {
        this.metrics.errors++;
        logger.error(`Socket error: ${socket.id}`, {
          error: err.message,
          userId: socket.user?.id,
        });
      });
    });
  }

  public joinDefaultRooms(socket: ISocket) {
    if (!socket.user?.id) return;

    try {
      socket.join(`user:${socket.user.id}`);

      if ((socket.user as any)?.role) {
        socket.join(`role:${(socket.user as any).role}`);
      }

      if ((socket.user as any)?.namespace) {
        socket.join(`ns:${(socket.user as any).namespace}`);
      }
    } catch (err) {
      logger.error('Failed to join default rooms:', err);
      this.metrics.errors++;
    }
  }

  public async joinRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.join(room);
      } catch (err) {
        logger.error(`Failed to join room ${room} for socket ${socket.id}:`, err);
        this.metrics.errors++;
      }
    });
  }

  public async leaveRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.leave(room);
      } catch (err) {
        logger.error(`Failed to leave room ${room} for socket ${socket.id}:`, err);
        this.metrics.errors++;
      }
    });
  }

  public async getUserSockets(userId: string): Promise<ISocket[]> {
    try {
      let socketIds =
        (await this.safeRedisCommand((client) => client.smembers(this.getkey(userId)))) || [];

      //   // Ensure socketIds is always an array
      //   if (!Array.isArray(socketIds)) {
      //     socketIds = [];
      //   }

      const activeSockets: ISocket[] = [];
      const cleanupIds: string[] = [];

      for (const id of socketIds) {
        const socket = this.io.sockets.sockets.get(id) as ISocket;
        if (socket) {
          activeSockets.push(socket);
        } else {
          cleanupIds.push(id);
        }
      }

      // Cleanup stale socket IDs in background
      if (cleanupIds.length > 0) {
        this.safeRedisCommand((client) => client.srem(this.getkey(userId), cleanupIds)).catch(
          (err) => {
            logger.error('Failed to cleanup stale socket IDs:', err);
            this.metrics.errors++;
          }
        );
      }

      return activeSockets;
    } catch (err) {
      logger.error('Failed to get user sockets from Redis:', err);
      this.metrics.errors++;
      return [];
    }
  }

  public async emitToUser(userId: string, event: string, data: any) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.emit(event, data);
      } catch (err) {
        logger.error(`Failed to emit to socket ${socket.id}:`, err);
        this.metrics.errors++;
      }
    });
  }

  public broadcastToRoom(room: string, event: string, data: any) {
    try {
      this.io.to(room).emit(event, data);
    } catch (err) {
      logger.error(`Failed to broadcast to room ${room}:`, err);
      this.metrics.errors++;
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      currentConnections: this.io?.engine?.clientsCount || 0,
    };
  }

  /**
   * Get all active socket IDs for a user
   */
  public async getActiveSocketIds(userId: string): Promise<string[]> {
    const sockets = await this.getUserSockets(userId);
    return sockets.map((s) => s.id);
  }

  /**
   * Force disconnect all sockets for a user
   */
  public async disconnectUser(userId: string, reason = 'admin request') {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      socket.disconnect(true);
      logger.info(`Disconnected socket ${socket.id} for user ${userId}`, { reason });
    });
  }
  public async disconnect() {
    try {
      logger.warn('Closing Socket connection: ' + toUTC(new Date()));
      await this.io.close();
      this.io.disconnectSockets(true);
    } catch (error) {
      logger.error('Error on closing Socket connection: ' + toUTC(new Date()));
    }
  }
}

export default new RedisSocket();
