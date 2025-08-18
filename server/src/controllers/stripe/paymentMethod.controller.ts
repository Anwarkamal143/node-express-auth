// src/controllers/stripe/paymentMethod.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';

export const attachPaymentMethod = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.paymentMethodId || !req.body.customerId) {
        throw new BadRequestException('Payment method ID and customer ID are required');
      }

      const paymentMethod = await stripeService.attachPaymentMethod(
        req.body.paymentMethodId,
        req.body.customerId
      );
      return SuccessResponse(res, {
        message: 'Payment method attached successfully',
        data: paymentMethod,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const detachPaymentMethod = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.paymentMethodId) {
        throw new BadRequestException('Payment method ID is required');
      }

      const paymentMethod = await stripeService.detachPaymentMethod(req.params.paymentMethodId);
      return SuccessResponse(res, {
        message: 'Payment method detached successfully',
        data: paymentMethod,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const listCustomerPaymentMethods = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.customerId) {
        throw new BadRequestException('Customer ID is required');
      }

      const paymentMethods = await stripeService.listCustomerPaymentMethods(
        req.params.customerId,
        (req.query.type as Stripe.PaymentMethodListParams.Type) || 'card'
      );
      return SuccessResponse(res, {
        message: 'Payment methods retrieved successfully',
        data: paymentMethods,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
