// src/controllers/stripe/paymentIntent.controller.ts
import { ErrorCode } from '@/enums/error-code.enum';
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const createPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.amount) {
        throw new BadRequestException('Amount is required', {
          errorCode: ErrorCode.VALIDATION_ERROR,
        });
      }

      const paymentIntent = await stripeService.createPaymentIntent({
        amount: req.body.amount,
        currency: req.body.currency || 'usd',
        customer: req.body.customerId,
        payment_method: req.body.paymentMethodId,
        confirm: req.body.confirm || false,
        metadata: req.body.metadata,
        description: req.body.description,
      });

      return SuccessResponse(res, {
        message: 'Payment intent created successfully',
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const confirmPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required');
      }

      const paymentIntent = await stripeService.confirmPaymentIntent(
        req.params.paymentIntentId,
        req.body
      );
      return SuccessResponse(res, {
        message: 'Payment intent confirmed successfully',
        data: paymentIntent,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const capturePaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required');
      }

      const paymentIntent = await stripeService.capturePaymentIntent(req.params.paymentIntentId);
      return SuccessResponse(res, {
        message: 'Payment intent captured successfully',
        data: paymentIntent,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const cancelPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required');
      }

      const paymentIntent = await stripeService.cancelPaymentIntent(req.params.paymentIntentId);
      return SuccessResponse(res, {
        message: 'Payment intent cancelled successfully',
        data: paymentIntent,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const getPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required');
      }

      const paymentIntent = await stripeService.retrievePaymentIntent(req.params.paymentIntentId);
      return SuccessResponse(res, {
        message: 'Payment intent retrieved successfully',
        data: paymentIntent,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const listPaymentIntents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentIntents = await stripeService.listPaymentIntents({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        customer: req.query.customerId as string,
      });
      return SuccessResponse(res, {
        message: 'Payment intents listed successfully',
        data: paymentIntents,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
