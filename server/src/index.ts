import { APP_CONFIG } from './config/app.config';

import { server } from './app';

server.listen(APP_CONFIG.PORT, () => {
  console.log(`Server running on http://localhost:${APP_CONFIG.PORT}`);
});
