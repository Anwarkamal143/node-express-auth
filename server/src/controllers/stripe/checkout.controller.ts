// src/controllers/stripe/checkout.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.success_url || !req.body.cancel_url) {
        throw new BadRequestException('Success and cancel URLs are required');
      }

      if (!req.body.line_items && !req.body.priceId) {
        throw new BadRequestException('Line items or price ID is required');
      }

      const lineItems = req.body.priceId
        ? [{ price: req.body.priceId, quantity: 1 }]
        : req.body.line_items;

      const session = await stripeService.createCheckoutSession({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: req.body.mode || 'payment',
        success_url: req.body.success_url,
        cancel_url: req.body.cancel_url,
        customer: req.body.customer,
        customer_email: req.body.customer_email,
        metadata: req.body.metadata,
        subscription_data: req.body.subscription_data,
      });

      return SuccessResponse(res, {
        message: 'Checkout session created successfully',
        data: { sessionId: session.id, url: session.url },
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const getCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.sessionId) {
        throw new BadRequestException('Session ID is required');
      }

      const session = await stripeService.retrieveCheckoutSession(req.params.sessionId);
      return SuccessResponse(res, {
        message: 'Checkout session retrieved successfully',
        data: session,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const expireCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.sessionId) {
        throw new BadRequestException('Session ID is required');
      }

      const session = await stripeService.expireCheckoutSession(req.params.sessionId);
      return SuccessResponse(res, {
        message: 'Checkout session expired successfully',
        data: session,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const listCheckoutSessions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await stripeService.listCheckoutSessions({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        customer: req.query.customerId as string,
      });
      return SuccessResponse(res, {
        message: 'Checkout sessions listed successfully',
        data: sessions,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
