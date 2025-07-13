import SocketWithRedis from '@/socket';

import bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import http from 'http';
import morgan from 'morgan';

import IoRedis from './app-redis';
// import { migrateDb } from './db';
import { errorHandler, listenToErrorEvents } from './middlewares/errorHandler';
import router from './routes';
const app = express();
// Catch uncaught exceptions
// 🔌 Attach global error listeners

const server = http.createServer(app);
listenToErrorEvents(server);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    methods: 'GET, POST, PUT, DELETE, OPTIONS',

    origin: ['http://localhost:3000', 'http://localhost:4000'],
  })
);
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

export { app, server };
