// Import necessary types and functions from Express
import { NextFunction, Request, Response, Router } from 'express';

// Import modular route handlers
import authRoutes from '@/routes/v1/auth.routes'; // Handles /auth endpoints (e.g. login, signup)
import socialRoutes from './social.routes'; // Handles /google OAuth endpoints
import userRoutes from './user.routes'; // Handles /user endpoints (e.g. profile, settings)

// Import application configuration (e.g. base API path like '/api/v1')
import { APP_CONFIG } from '@/config/app.config';

// Import custom error handler for unknown routes
import AppError from '@/utils/app-error';
import uploaderRoutes from './uploader.routes';

// Create the main Express Router instance
const router = Router();

// Create a sub-router to group versioned or namespaced APIs
const api = Router();

// Mount individual route modules under respective prefixes
api
  .use('/auth', authRoutes) // Mounts all auth-related routes at /auth (e.g. POST /auth/login)
  .use('/user', userRoutes) // Mounts all user-related routes at /user (e.g. GET /user/me)
  .use('/google', socialRoutes) // Mounts Google OAuth flow routes at /google
  .use('/media', uploaderRoutes); // Uploading media

// Mount the API router under the base path from config (e.g. /api/v1)
router.use(APP_CONFIG.BASE_API_PATH, api);

// call back when google will send data back to the server
router.use('/api/google', socialRoutes);

// Health check endpoint to verify server is running (used by monitoring tools)
router.get('/health', (_req: Request, res: Response, _next: NextFunction) => {
  res.status(200).send('OK'); // Simple 200 response
});

// Catch-all handler for undefined routes
// This runs if no route above matches the request
router.all(/(.*)/, (req, _, next) => {
  // Forward a custom 404 error to the error-handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Export the configured router to be used in your main server entry (e.g. app.ts)
export default router;
