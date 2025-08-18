// src/controllers/stripe/webhook.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const handleWebhook = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body;

    try {
      if (!sig) {
        throw new BadRequestException('Missing Stripe signature');
      }

      const event = await stripeService.handleStripeEvent(rawBody);
      return SuccessResponse(res, {
        message: 'Webhook handled successfully',
        data: { eventId: event.id, type: event.type },
      });
    } catch (error: any) {
      return SuccessResponse(res, {
        statusCode: 400,
        message: 'Webhook handling failed',
        error: error.message,
      });
    }
  }
);
