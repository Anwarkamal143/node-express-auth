import uploaderController from '@/controllers/uploader.controller';
import authMiddleware from '@/middlewares/auth.middleware';
import { Router } from 'express';
import multer from 'multer';
const upload = multer();
const router = Router();
router.all(/(.*)/, authMiddleware.isLoggedIn);
router.route('/chunk').post(upload.single('chunk'), uploaderController.uploadChunk);
router.get('/status', uploaderController.uploadStatus);
router.delete('/cleanup', uploaderController.cleanUpload);

export default router;
