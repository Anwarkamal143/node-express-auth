import { APP_CONFIG } from '@/config/app.config';

import { drizzle } from 'drizzle-orm/postgres-js';

import postgres from 'postgres';

import * as schema from './schema';
export * from 'drizzle-orm';
export { PgColumn } from 'drizzle-orm/pg-core';
export * from './enumTypes';
export const client = postgres(APP_CONFIG.DB_URL);
export const db = drizzle(client, {
  schema,
});
