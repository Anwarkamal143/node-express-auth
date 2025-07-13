"use client";

import { createContext } from "react";
import { Socket } from "socket.io-client";
export type ISocketContextProps = {
  isConnected: boolean;
  socket?: Socket;
  // send: Socket["emit"];
  // subscribe: Socket["on"];
  // disconnect: Socket["disconnect"];
  // off: Socket["off"];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SocketContext = createContext<Partial<ISocketContextProps & any>>({
  socket: undefined,
  isConnected: false,
});
