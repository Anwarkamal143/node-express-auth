import { APP_CONFIG } from '@/config/app.config';
import { Resend } from 'resend';

export const resend = new Resend(APP_CONFIG.RESEND_API_KEY);
