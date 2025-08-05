import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

import IoRedis from '@/app-redis';
import { verifyJwt } from '@/utils/jwt';
import { logger } from '@/utils/logger';

/**
 * Custom extended Socket.IO Socket type with optional user property
 */
type ISocket = Socket & { user?: IServerCookieType | null };

/**
 * Socket.IO CORS configuration
 */
const RedisSocket_CORS = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

/**
 * Redis-based rate limit configuration
 */
const MAX_EVENTS_PER_MINUTE = 100;

/**
 * List of authorized namespaces
 */
const ALLOWED_NAMESPACES = ['/default', '/chat', '/admin'];

/**
 * RedisSocket encapsulates logic for:
 * - Authenticating socket connections via JWT
 * - Mapping userId <-> socketId via Redis (multi-socket supported)
 * - Managing socket lifecycle events
 * - Supporting Redis pub/sub adapter for scaling
 * - Room-based connection grouping and messaging
 * - Namespace-based access control
 * - Distributed rate limiting via Redis
 * - Namespace validation and stale socket cleanup
 */
class RedisSocket {
  private _io!: Server;
  private socket!: ISocket;

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

  public connect(httpServer?: HttpServer): Server {
    if (!this.io && httpServer) {
      this.io = new Server(httpServer, {
        cors: RedisSocket_CORS,
        adapter: createAdapter(this.redis),
      });
      this.setupConnection(this.io);
    }
    return this.io;
  }

  public authenticate(io: Server) {
    io.use(async (socket: ISocket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        socket.user = null;
        return next(new Error('Authentication error: Token required'));
      }
      try {
        const decoded = await verifyJwt(token);
        if (!decoded.data) return next(new Error('Authentication error: Invalid token'));

        const namespace = socket.nsp.name;
        if (!ALLOWED_NAMESPACES.includes(namespace)) {
          return next(new Error(`Namespace not allowed: ${namespace}`));
        }

        socket.user = decoded?.data.user;
        next();
      } catch (error) {
        socket.user = null;
        socket.disconnect();
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  public setupConnection(io: Server) {
    this.authenticate(io);
    io.on('connection', async (socket: ISocket) => {
      if (!socket.user?.id) {
        socket.disconnect();
        return;
      }

      try {
        await this.redis.sadd(`sockets:${socket.user.id}`, socket.id);
      } catch (err) {
        logger.error('Failed to store socket ID in Redis:', err);
      }

      logger.info(`Socket connected: ${socket.id}, User: ${socket.user.id}`);

      socket.use(async (_packet, next) => {
        const key = `rate:${socket.id}`;
        try {
          const count = await this.redis.incr(key);
          if (count === 1) {
            await this.redis.expire(key, 60);
          }
          if (count > MAX_EVENTS_PER_MINUTE) {
            return next(new Error('Rate limit exceeded'));
          }
          next();
        } catch (err) {
          logger.error('Rate limiting failed:', err);
          next();
        }
      });

      this.joinDefaultRooms(socket);

      socket.on('disconnect', async () => {
        try {
          await this.redis.srem(`sockets:${socket.user?.id}`, socket.id);
        } catch (err) {
          logger.error('Failed to remove socket ID from Redis:', err);
        }
        logger.info(`Socket disconnected: ${socket.id}, User: ${socket.user?.id}`);
        socket.user = null;
      });
    });
  }

  public joinDefaultRooms(socket: ISocket) {
    socket.join(`user:${socket.user?.id}`);
    if ((socket.user as any)?.role) {
      socket.join(`role:${(socket.user as any).role}`);
    }
    if ((socket.user as any)?.namespace) {
      socket.join(`ns:${(socket.user as any).namespace}`);
    }
  }

  public async joinRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => socket.join(room));
  }

  public async leaveRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => socket.leave(room));
  }

  public getSocketInstance() {
    return this.socket;
  }

  public async getUserSockets(userId: string): Promise<ISocket[]> {
    try {
      const socketIds = await this.redis.smembers(`sockets:${userId}`);
      const activeSockets: ISocket[] = [];

      for (const id of socketIds) {
        const socket = this.io.sockets.sockets.get(id) as ISocket;
        if (socket) {
          activeSockets.push(socket);
        } else {
          await this.redis.srem(`sockets:${userId}`, id); // cleanup stale socket id
        }
      }

      return activeSockets;
    } catch (err) {
      logger.error('Failed to get user sockets from Redis:', err);
      return [];
    }
  }

  public async currentSocket(userId?: string): Promise<ISocket | undefined> {
    if (!userId) return undefined;
    const sockets = await this.getUserSockets(userId);
    return sockets[0];
  }

  public broadcastToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }

  public async emitToUser(userId: string, event: string, data: any) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => socket.emit(event, data));
  }

  public getInstances() {
    return {
      io: this.io,
      getSocket: this.currentSocket.bind(this),
      emitToUser: this.emitToUser.bind(this),
      broadcastToRoom: this.broadcastToRoom.bind(this),
      joinRoom: this.joinRoom.bind(this),
      leaveRoom: this.leaveRoom.bind(this),
    };
  }
}

export default new RedisSocket();
