// src/controllers/stripe/subscription.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';

export const createSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.customerId || !req.body.priceId) {
        throw new BadRequestException('Customer ID and price ID are required');
      }

      const subscription = await stripeService.createSubscription({
        customer: req.body.customerId,
        items: [{ price: req.body.priceId }],
        payment_behavior: req.body.paymentBehavior || 'default_incomplete',
        metadata: req.body.metadata,
      });

      return SuccessResponse(res, {
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const getSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.subscriptionId) {
        throw new BadRequestException('Subscription ID is required');
      }

      const subscription = await stripeService.retrieveSubscription(req.params.subscriptionId);
      return SuccessResponse(res, {
        message: 'Subscription retrieved successfully',
        data: subscription,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const updateSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.subscriptionId) {
        throw new BadRequestException('Subscription ID is required');
      }

      const subscription = await stripeService.updateSubscription(
        req.params.subscriptionId,
        req.body
      );
      return SuccessResponse(res, {
        message: 'Subscription updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const cancelSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.subscriptionId) {
        throw new BadRequestException('Subscription ID is required');
      }

      const subscription = await stripeService.cancelSubscription(req.params.subscriptionId);
      return SuccessResponse(res, {
        message: 'Subscription cancelled successfully',
        data: subscription,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const listSubscriptions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriptions = await stripeService.listSubscriptions({
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        customer: req.query.customerId as string,
        status: req.query.status as Stripe.SubscriptionListParams.Status,
      });
      return SuccessResponse(res, {
        message: 'Subscriptions listed successfully',
        data: subscriptions,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const searchSubscriptions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.query) {
        throw new BadRequestException('Search query is required');
      }

      const results = await stripeService.searchSubscriptions({
        query: req.body.query,
        limit: req.body.limit || 10,
      });
      return SuccessResponse(res, {
        message: 'Subscription search completed',
        data: results,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
