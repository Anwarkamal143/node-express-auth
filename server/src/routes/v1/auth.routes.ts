import authController from '@/controllers/auth.controller';
import { Router } from 'express';

const router = Router();

router.route('/sign-out').post(authController.signOut);
router.route('/register').post(authController.signUp);
router.route('/login').post(authController.login);
router.route('/verify-tokens').post(authController.verifyAndCreateTokens);
router.route('/refresh-tokens').get(authController.refreshTokens);

export default router;
