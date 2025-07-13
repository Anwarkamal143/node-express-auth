import userController from '@/controllers/user.controller';
import authMiddleware from '@/middlewares/auth.middleware';
import { Router } from 'express';

const router = Router();
router.all(/(.*)/, authMiddleware.isLoggedIn);
router.route('').get(userController.me);
router.route('/me').get(userController.me);
// router.route('/google/callback').get(googleAuthCallback);
// router.route("/").get(googleSignAuth);

export default router;
