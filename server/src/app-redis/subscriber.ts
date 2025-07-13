// import RedisSocket from '@/sockets';
import { Socket } from "socket.io";
import IoRedis from ".";
export type ISocketEmit = {
  toEmit?: Socket["to"];
  ioEmit?: Socket["emit"];
  broadCastEmit?: Socket["broadcast"]["emit"];
  data: any;
};
export const subscribe = async () => {
  const redis = IoRedis.getNewInstance();
  await redis.subscribe(
    // "channel-1",
    // "channel-2",
    "workspace-update",
    (err, count) => {
      if (err) {
        // Just like other commands, subscribe() can fail for some reasons,
        // ex network issues.
        console.error("Failed to subscribe: %s", err.message);
      } else {
        // `count` represents the number of channels this client are currently subscribed to.
        console.log(
          `Subscribed successfully! This client is currently subscribed to ${count} channels.`
        );
      }
    }
  );
  redis.on("message", (channel, message) => {
    // const { socket, io } = RedisSocket.getInstances();
    console.log(`Received ${message} from ${channel}`);
    // socket.broadcast.emit(channel, message);
  });
};
