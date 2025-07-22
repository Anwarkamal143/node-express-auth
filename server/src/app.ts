import SocketWithRedis from '@/socket';

import bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import express from 'express';
import http from 'http';
import morgan from 'morgan';

import IoRedis from './app-redis';
// import { migrateDb } from './db';
import { APP_CONFIG } from './config/app.config';
import { HTTPSTATUS } from './config/http.config';
import { ErrorCode } from './enums/error-code.enum';
import { errorHandler, listenToErrorEvents } from './middlewares/errorHandler';
import router from './routes/v1';
import { HttpException } from './utils/catch-errors';
import { logger } from './utils/logger';
const app = express();
// Catch uncaught exceptions
// 🔌 Attach global error listeners
const IS_PRODUCTION = APP_CONFIG.NODE_ENV === 'production';
const server = http.createServer(app);

// Cors options
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!IS_PRODUCTION || !origin || APP_CONFIG.WHITELIST_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(
        new HttpException(
          `CORS error ${origin} is not allowed by CORS`,
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.CORS_ERROR
        ),
        false
      );
      logger.warn(`CORS error ${origin} is not allowed by CORS`);
    }
  },
  credentials: true,
  // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser());

// Redis connection
IoRedis.connect();
// Socket connection
SocketWithRedis.connect(server);

// // Db connection
// if (APP_CONFIG.NODE_ENV !== 'production') {
//   // eslint-disable-next-line no-console
//   migrateDb();
// }

// app.options("*", (_req, res) => {
//   console.log({ "*": "Star" });
//   res.set({
//     "Access-Control-Allow-Origin": "*", // Replace '*' with specific origin if needed
//     "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//     "Access-Control-Allow-Headers": "Authorization, Content-Type",
//   });
//   res.status(200).end(); // End the response here
// });
app.use(router);

app.use(errorHandler);

listenToErrorEvents(server);
export { app, server };
