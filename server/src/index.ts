import { APP_CONFIG } from './config/app.config';

import { server } from './app';
import { connectDB } from './db';
import { logger } from './utils/logger';

server.listen(APP_CONFIG.PORT, () => {
  connectDB();
  logger.info(`Server running on http://localhost:${APP_CONFIG.PORT}`);
});
