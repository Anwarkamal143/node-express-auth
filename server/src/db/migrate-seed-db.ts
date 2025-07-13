import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { APP_CONFIG } from '@/config/app.config';
import { logger } from '@/utils/logger';
import { seedDatabase } from './seed';
import * as schema from './tables';

const migrationClient = postgres(APP_CONFIG.DB_URL, { max: 1 });
const migrationDb = drizzle(migrationClient, { schema });
const runMigrations = async () => {
  console.log(APP_CONFIG);
  try {
    logger.info('🚀 Starting database migrations...');
    await migrate(migrationDb, { migrationsFolder: 'migrations' });
    logger.info('✅ Database migrations completed');

    logger.info('🌱 Starting database seeding...');
    await seedDatabase(migrationDb);
    // await migrationClient.end();
    logger.info('🔌 Migration client disconnected');
    logger.info('🎉 Database seeding completed');
  } catch (error: any) {
    logger.error('❌ Migration/seed failed', error);
    process.exit(1);
  } finally {
    await migrationClient.end().catch(() => {});
    process.exit(0);
  }
};

runMigrations();
