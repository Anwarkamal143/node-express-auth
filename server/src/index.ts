import { APP_CONFIG } from './config/app.config';
// In your main server file:
import { server } from './app';
import { connectDB } from './db';

import { initializeErrorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';

server.listen(APP_CONFIG.PORT, () => {
  connectDB();
  logger.info(`Server running on http://localhost:${APP_CONFIG.PORT}`);
});
initializeErrorHandler(server);
