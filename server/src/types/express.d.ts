// import { Language, User } from "../custom";

import { Server, Socket } from 'socket.io';

// import { Request } from 'express';
// import { users } from '../db/tables';
// import { IServerCookieType } from './cookie';
// // import { Server } from 'socket.io';
// // import { ISocket } from './socket';
// type IUser = typeof users.$inferSelect;
// // to make the file a module and avoid the TypeScript error
// // export {};
// type IRequest = Request & {
//   user?: IUser;
// };
declare global {
  namespace Express {
    export interface Request {
      //   language?: Language;
      user?: any;
      skt?: Socket & { user?: IServerCookieType };
      io?: Server;
      resetTokens?: boolean;
      tokenData: IServerCookieType;
      file?: File;
    }
  }
}
