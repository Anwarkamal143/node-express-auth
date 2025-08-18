import stripService from '@/services/stripe.service';
// src/webhooks/stripe.webhook.ts
import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
import { getStripe } from '@/config/stripe';
import { ErrorCode } from '@/enums/error-code.enum';
import { logger } from '@/utils/logger';
import { ErrorResponse, SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';

export class StripeWebhook {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly supportedEvents: Set<string>;

  constructor(public stripeService = stripService) {
    this.stripe = getStripe();
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    this.supportedEvents = new Set([
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'charge.refunded',
      'checkout.session.completed',
    ]);
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body;

    if (!sig) {
      logger.error('Missing Stripe signature header');
      return this.sendErrorResponse('Missing signature header', HTTPSTATUS.BAD_REQUEST, next);
    }

    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
      logger.info(`Received Stripe event: ${event.type}`);

      if (!this.supportedEvents.has(event.type)) {
        logger.warn(`Unsupported event type: ${event.type}`);
        return this.sendSuccessResponse(res);
      }

      await this.routeEvent(event);
      this.sendSuccessResponse(res);
    } catch (err: unknown) {
      this.handleWebhookError(err, next);
    }
  }

  private async routeEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event);
          break;
        default:
          logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (error: unknown) {
      logger.error(`Error processing ${event.type} event:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    logger.info(`Payment succeeded: ${paymentIntent.id}`);

    try {
      await this.stripeService.handleStripeEvent(event);
      // await handleStripeEvent('payment_intent.succeeded', {
      //   paymentIntentId: paymentIntent.id,
      //   amount: paymentIntent.amount,
      //   customer: paymentIntent.customer,
      //   metadata: paymentIntent.metadata,
      // });
    } catch (error) {
      logger.error(`Failed to process payment intent ${paymentIntent.id}:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const lastPaymentError = paymentIntent.last_payment_error;

    logger.error(`Payment failed: ${paymentIntent.id}`, {
      code: lastPaymentError?.code,
      message: lastPaymentError?.message,
      type: lastPaymentError?.type,
    });

    await this.stripeService.handleStripeEvent(event);
    // await handleStripeEvent('payment_intent.failed', {
    //   paymentIntentId: paymentIntent.id,
    //   error: lastPaymentError,
    // });
  }

  private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    logger.info(`Subscription created: ${subscription.id}`);
    await this.stripeService.handleStripeEvent(event);
    // await handleStripeEvent('subscription.created', {
    //   subscriptionId: subscription.id,
    //   customerId: subscription.customer,
    //   status: subscription.status,
    //   items: subscription.items.data.map((item) => ({
    //     priceId: item.price.id,
    //     quantity: item.quantity,
    //   })),
    // });
  }

  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    logger.info(`Subscription updated: ${subscription.id}`);
    // Implementation similar to handleSubscriptionCreated
    await this.stripeService.handleStripeEvent(event);
  }

  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    logger.info(`Subscription deleted: ${subscription.id}`);
    // Implementation
    await this.stripeService.handleStripeEvent(event);
  }

  private async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    logger.info(`Invoice payment succeeded: ${invoice.id}`);
    // Implementation
    await this.stripeService.handleStripeEvent(event);
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    logger.error(`Invoice payment failed: ${invoice.id}`);
    // Implementation
    await this.stripeService.handleStripeEvent(event);
  }

  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    logger.info(`Charge refunded: ${charge.id}`);
    // Implementation
    await this.stripeService.handleStripeEvent(event);
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    logger.info(`Checkout session completed: ${session.id}`);
    // Implementation
    await this.stripeService.handleStripeEvent(event);
  }

  private sendSuccessResponse(res: Response): void {
    // res.json({ received: true });
    SuccessResponse(res, {
      data: { received: true },
      message: 'Web Hook Success',
      statusCode: 200,
    });
  }

  private sendErrorResponse(message: string, statusCode: HttpStatusCode, next: NextFunction): void {
    // res.status(statusCode).json({
    //   code: ErrorCode.STRIPE_WEBHOOK_ERROR,
    //   message,
    //   statusCode,
    // });
    next(
      ErrorResponse(message, statusCode, {
        errorCode: ErrorCode.STRIPE_WEBHOOK_ERROR,
      })
    );
  }

  private handleWebhookError(err: unknown, next: NextFunction): void {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      logger.error('Stripe signature verification failed:', err);
      this.sendErrorResponse('Invalid signature', HTTPSTATUS.UNAUTHORIZED, next);
    } else if (err instanceof Error) {
      logger.error('Webhook processing error:', err);
      this.sendErrorResponse(err.message, HTTPSTATUS.BAD_REQUEST, next);
    } else {
      logger.error('Unknown webhook error:', err);
      this.sendErrorResponse('Internal server error', HTTPSTATUS.INTERNAL_SERVER_ERROR, next);
    }
  }
}
