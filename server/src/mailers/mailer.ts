import { APP_CONFIG } from '@/config/app.config';
import { resend } from './resendClient';

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
};

const mailer_sender =
  APP_CONFIG.NODE_ENV === 'development'
    ? `no-reply <onboarding@resend.dev>`
    : `no-reply <${APP_CONFIG.MAILER_SENDER}>`;

export const sendEmail = async ({ to, from = mailer_sender, subject, text, html }: Params) =>
  await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
  });
