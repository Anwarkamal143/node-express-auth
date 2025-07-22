import socialAuthController from '@/controllers/social-auth.controller';
import { Router } from 'express';

const router = Router();

router.route('/').get(socialAuthController.googleSignAuth);
router.route('/callback').get(socialAuthController.googleAuthCallback);
// router.route("/").get(googleSignAuth);

export default router;
