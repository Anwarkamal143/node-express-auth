// Example usage in a controller
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const createCustomer = catchAsync(async (req: Request, res: Response) => {
  try {
    const customer = await stripeService.createCustomer({
      email: req.body.email,
      name: req.body.name,
      metadata: { userId: req.body.userId },
    });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const createPaymentIntent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: req.body.amount,
        currency: 'usd',
        customer: req.body.customerId,
        metadata: { orderId: req.body.orderId },
      });
      return SuccessResponse(res, {
        message: 'Payment intent created successfully',
        data: { client_secret: paymentIntent.client_secret },
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const createSubscription = catchAsync(async (req: Request, res: Response) => {
  try {
    const subscription = await stripeService.createSubscription({
      customer: req.body.customerId,
      items: [{ price: req.body.priceId }],
      metadata: { userId: req.body.userId },
    });
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced customer controller
export const getCustomerPaymentMethods = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentMethods = await stripeService.listCustomerPaymentMethods(
        req.params.customerId,
        'card'
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

// Checkout session controller
export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await stripeService.createCheckoutSession({
        mode: 'payment',
        line_items: req.body.items,
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/canceled`,
        customer_email: req.body.email,
        metadata: { orderId: req.body.orderId },
      });
      return SuccessResponse(res, {
        message: 'Checkout session created successfully',
        data: { sessionId: session.id },
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

// Subscription management
export const updateSubscription = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await stripeService.updateSubscription(req.params.subscriptionId, {
        items: req.body.items,
        proration_behavior: 'always_invoice',
      });
      return SuccessResponse(res, {
        message: 'Subscription updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
