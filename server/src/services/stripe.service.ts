// src/services/stripe.service.ts
import { HTTPSTATUS, HttpStatusCode } from '@/config/http.config';
import { getStripe } from '@/config/stripe';
import { ErrorCode } from '@/enums/error-code.enum';
import {
  CustomerParams,
  InvoiceParams,
  PaymentIntentParams,
  PriceParams,
  ProductParams,
  StripeConfig,
  SubscriptionParams,
} from '@/types/stripe';
import { HttpException } from '@/utils/catch-errors';
import { logger } from '@/utils/logger';
import Stripe from 'stripe';

type StripeOperation = 'create' | 'retrieve' | 'update' | 'delete' | 'confirm' | 'list' | 'search';
type StripeResource =
  | 'customer'
  | 'payment_intent'
  | 'subscription'
  | 'product'
  | 'price'
  | 'invoice'
  | 'payment_method'
  | 'setup_intent'
  | 'checkout_session'
  | 'coupon'
  | 'promotion_code'
  | 'refund';

class StripeService {
  private readonly stripe: Stripe;
  private readonly apiVersion = '2023-08-16';

  constructor(config?: StripeConfig) {
    this.stripe = getStripe({
      ...config,
      apiVersion: this.apiVersion,
      maxNetworkRetries: 3,
      timeout: 10000,
    });
  }

  // ------------------------------
  // Webhook Event Handler
  // ------------------------------
  async handleStripeEvent1(event: Stripe.Event): Promise<Stripe.Event> {
    try {
      // const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      logger.info(`Stripe event received`, {
        id: event.id,
        type: event.type,
      });

      // Example: you can branch event handling here
      switch (event.type) {
        case 'payment_intent.succeeded':
          logger.info(`PaymentIntent succeeded`, { id: event.data.object['id'] });
          break;

        case 'invoice.payment_failed':
          logger.warn(`Invoice payment failed`, { id: event.data.object['id'] });
          break;

        case 'customer.subscription.deleted':
          logger.info(`Subscription cancelled`, { id: event.data.object['id'] });
          break;

        default:
          logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }

      return event;
    } catch (error) {
      logger.error('Stripe webhook verification failed', { error });

      throw this.createAppError(
        'Invalid Stripe webhook signature',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.STRIPE_INVALID_REQUEST_ERROR
      );
    }
  }
  async handleStripeEvent<T extends Stripe.Event>(event: T) {
    logger.info(`Stripe event received`, {
      id: event.id,
      type: event.type,
    });
    const { type, data } = event;

    try {
      switch (type) {
        case 'payment_intent.succeeded': {
          const { id, amount, customer, metadata } = data.object as Stripe.PaymentIntent;
          logger.info(`[Stripe] PaymentIntent succeeded: ${id}`, {
            amount,
            customer,
            metadata,
          });

          // 👉 Update order/payment record in DB
          // await db.orders.update({ stripePaymentIntentId: paymentIntentId }, { status: "paid" });
          return event;
        }

        case 'payment_intent.payment_failed': {
          const { id, last_payment_error } = data.object as Stripe.PaymentIntent;
          logger.error(`[Stripe] PaymentIntent failed: ${id}`, last_payment_error);

          // 👉 Update order/payment record as failed
          // await db.orders.update({ stripePaymentIntentId: paymentIntentId }, { status: "failed" });
          return event;
        }

        case 'customer.subscription.created': {
          const { id, customer, status, items } = data.object as Stripe.Subscription;
          logger.info(`[Stripe] Subscription created: ${id}`, {
            customerId: customer.toString(),
            status,
            items,
          });

          // 👉 Create subscription record in DB
          // await db.subscriptions.create({ stripeId: subscriptionId, customerId, status });
          return event;
        }

        case 'customer.subscription.updated': {
          const { id, status } = data.object as Stripe.Subscription;
          logger.info(`[Stripe] Subscription updated: ${id}`, {
            status,
          });

          // 👉 Update subscription in DB
          // await db.subscriptions.update({ stripeId: subscriptionId }, { status });
          return event;
        }

        case 'customer.subscription.deleted': {
          const { id } = data.object as Stripe.Subscription;
          logger.info(`[Stripe] Subscription deleted: ${id}`);

          // 👉 Mark subscription inactive in DB
          // await db.subscriptions.update({ stripeId: subscriptionId }, { status: "canceled" });
          return event;
        }

        case 'invoice.payment_succeeded': {
          const { id, total, customer } = data.object as Stripe.Invoice;
          logger.info(`[Stripe] Invoice payment succeeded: ${id}`, {
            total,
            customerId: customer?.toString(),
          });

          // 👉 Mark invoice as paid in DB
          // await db.invoices.update({ stripeId: invoiceId }, { status: "paid" });
          return event;
        }

        case 'invoice.payment_failed': {
          const { id, customer } = data.object as Stripe.Invoice;
          logger.error(`[Stripe] Invoice payment failed: ${id}`, {
            customerId: customer?.toString(),
          });

          // 👉 Handle failed invoice (maybe retry or notify customer)
          return event;
        }

        case 'charge.refunded': {
          const { id, amount_refunded } = data.object as Stripe.Charge;
          logger.info(`[Stripe] Charge refunded: ${id}`, {
            amountRefunded: amount_refunded,
          });

          // 👉 Update order/refund record
          return event;
        }

        case 'checkout.session.completed': {
          const { id, customer, subscription } = data.object as Stripe.Checkout.Session;
          logger.info(`[Stripe] Checkout session completed: ${id}`, {
            customerId: customer?.toString(),
            subscriptionId: subscription?.toString(),
          });

          // 👉 Create order / activate subscription
          return event;
        }

        default:
          logger.warn(`[Stripe] Unhandled event type: ${type}`);
      }
      return event;
    } catch (err) {
      logger.error(`[Stripe] Error handling ${type}`, err);
      throw err;
    }
  }
  // ------------------------------
  // Customer Operations
  // ------------------------------
  async createCustomer(params: CustomerParams): Promise<Stripe.Customer> {
    return this.handleStripeOperation(
      () => this.stripe.customers.create(params),
      'create',
      'customer'
    );
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.handleStripeOperation(
      () => this.stripe.customers.retrieve(customerId),
      'retrieve',
      'customer'
    ) as Promise<Stripe.Customer>;
  }

  // ------------------------------
  // Payment Intent Operations
  // ------------------------------
  async createPaymentIntent(params: PaymentIntentParams): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.create(params),
      'create',
      'payment_intent'
    );
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    params?: Stripe.PaymentIntentConfirmParams
  ): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.confirm(paymentIntentId, params),
      'confirm',
      'payment_intent'
    );
  }

  // ------------------------------
  // Subscription Operations
  // ------------------------------
  async createSubscription(params: SubscriptionParams): Promise<Stripe.Subscription> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.create(params),
      'create',
      'subscription'
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.cancel(subscriptionId),
      'delete',
      'subscription'
    );
  }

  // ------------------------------
  // Product Operations
  // ------------------------------
  async createProduct(params: ProductParams): Promise<Stripe.Product> {
    return this.handleStripeOperation(
      () => this.stripe.products.create(params),
      'create',
      'product'
    );
  }

  // ------------------------------
  // Price Operations
  // ------------------------------
  async createPrice(params: PriceParams): Promise<Stripe.Price> {
    return this.handleStripeOperation(() => this.stripe.prices.create(params), 'create', 'price');
  }

  // ------------------------------
  // Invoice Operations
  // ------------------------------
  async createInvoice(params: InvoiceParams): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.create(params),
      'create',
      'invoice'
    );
  }

  // ------------------------------
  // Generic Operation Handler
  // ------------------------------
  private async handleStripeOperation<T>(
    operation: () => Promise<T>,
    operationType: StripeOperation,
    resourceType: StripeResource
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      logger.info(`Stripe ${operationType} ${resourceType} success`, {
        operation: operationType,
        resource: resourceType,
        duration,
      });

      return result;
    } catch (error) {
      this.handleStripeError(error, operationType, resourceType);
      throw error;
    }
  }

  private handleStripeError(
    error: unknown,
    operationType?: StripeOperation,
    resourceType?: StripeResource
  ): never {
    if (error instanceof Stripe.errors.StripeError) {
      const context = {
        type: error.type,
        code: error.code,
        operation: operationType,
        resource: resourceType,
      };

      logger.error(`Stripe API Error: ${error.message}`, context);

      switch (error.type) {
        case 'StripeCardError':
          throw this.createAppError(
            error.message || 'Payment method was declined',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.STRIPE_CARD_ERROR,
            { declineCode: error.code }
          );

        case 'StripeRateLimitError':
          throw this.createAppError(
            'Too many requests to payment processor',
            HTTPSTATUS.TOO_MANY_REQUESTS,
            ErrorCode.STRIPE_RATE_LIMIT_ERROR
          );

        case 'StripeInvalidRequestError':
          throw this.createAppError(
            error.message || 'Invalid payment request',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.STRIPE_INVALID_REQUEST_ERROR,
            { param: error.param }
          );

        case 'StripeAPIError':
          throw this.createAppError(
            'Payment service unavailable',
            HTTPSTATUS.SERVICE_UNAVAILABLE,
            ErrorCode.STRIPE_API_ERROR,
            { requestId: error.requestId }
          );

        case 'StripeConnectionError':
          throw this.createAppError(
            'Network connection to payment processor failed',
            HTTPSTATUS.SERVICE_UNAVAILABLE,
            ErrorCode.STRIPE_CONNECTION_ERROR
          );

        case 'StripeAuthenticationError':
          throw this.createAppError(
            'Payment processor authentication failed',
            HTTPSTATUS.UNAUTHORIZED,
            ErrorCode.STRIPE_AUTHENTICATION_ERROR
          );

        default:
          throw this.createAppError(
            error.message || 'Payment processing error',
            HTTPSTATUS.INTERNAL_SERVER_ERROR,
            ErrorCode.STRIPE_UNEXPECTED_ERROR
          );
      }
    }

    logger.error('Unknown error in StripeService:', error);
    throw this.createAppError(
      'Internal payment processing error',
      HTTPSTATUS.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR
    );
  }

  // ------------------------------
  // Webhook Event Handler (existing)
  // ------------------------------
  // ... keep your existing handleStripeEvent methods ...

  // ------------------------------
  // Customer Operations (enhanced)
  // ------------------------------
  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    return this.handleStripeOperation(
      () => this.stripe.customers.update(customerId, params),
      'update',
      'customer'
    );
  }

  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    return this.handleStripeOperation(
      () => this.stripe.customers.del(customerId),
      'delete',
      'customer'
    );
  }

  async listCustomers(
    params?: Stripe.CustomerListParams
  ): Promise<Stripe.ApiList<Stripe.Customer>> {
    return this.handleStripeOperation(() => this.stripe.customers.list(params), 'list', 'customer');
  }

  async searchCustomers(
    params: Stripe.CustomerSearchParams
  ): Promise<Stripe.ApiSearchResult<Stripe.Customer>> {
    return this.handleStripeOperation(
      () => this.stripe.customers.search(params),
      'search',
      'customer'
    );
  }

  // ------------------------------
  // Payment Method Operations (new)
  // ------------------------------
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return this.handleStripeOperation(
      () => this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }),
      'create',
      'payment_method'
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.handleStripeOperation(
      () => this.stripe.paymentMethods.detach(paymentMethodId),
      'delete',
      'payment_method'
    );
  }

  async listCustomerPaymentMethods(
    customerId: string,
    type: Stripe.PaymentMethodListParams.Type
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    return this.handleStripeOperation(
      () => this.stripe.paymentMethods.list({ customer: customerId, type }),
      'list',
      'payment_method'
    );
  }

  // ------------------------------
  // Setup Intent Operations (new)
  // ------------------------------
  async createSetupIntent(params: Stripe.SetupIntentCreateParams): Promise<Stripe.SetupIntent> {
    return this.handleStripeOperation(
      () => this.stripe.setupIntents.create(params),
      'create',
      'setup_intent'
    );
  }

  async confirmSetupIntent(
    setupIntentId: string,
    params?: Stripe.SetupIntentConfirmParams
  ): Promise<Stripe.SetupIntent> {
    return this.handleStripeOperation(
      () => this.stripe.setupIntents.confirm(setupIntentId, params),
      'confirm',
      'setup_intent'
    );
  }

  // ------------------------------
  // Payment Intent Operations (enhanced)
  // ------------------------------
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.retrieve(paymentIntentId),
      'retrieve',
      'payment_intent'
    );
  }

  async updatePaymentIntent(
    paymentIntentId: string,
    params: Stripe.PaymentIntentUpdateParams
  ): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.update(paymentIntentId, params),
      'update',
      'payment_intent'
    );
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.capture(paymentIntentId),
      'confirm',
      'payment_intent'
    );
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.cancel(paymentIntentId),
      'delete',
      'payment_intent'
    );
  }

  async listPaymentIntents(
    params?: Stripe.PaymentIntentListParams
  ): Promise<Stripe.ApiList<Stripe.PaymentIntent>> {
    return this.handleStripeOperation(
      () => this.stripe.paymentIntents.list(params),
      'list',
      'payment_intent'
    );
  }

  // ------------------------------
  // Subscription Operations (enhanced)
  // ------------------------------
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.retrieve(subscriptionId),
      'retrieve',
      'subscription'
    );
  }

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.update(subscriptionId, params),
      'update',
      'subscription'
    );
  }

  async listSubscriptions(
    params?: Stripe.SubscriptionListParams
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.list(params),
      'list',
      'subscription'
    );
  }

  async searchSubscriptions(
    params: Stripe.SubscriptionSearchParams
  ): Promise<Stripe.ApiSearchResult<Stripe.Subscription>> {
    return this.handleStripeOperation(
      () => this.stripe.subscriptions.search(params),
      'search',
      'subscription'
    );
  }

  // ------------------------------
  // Product Operations (enhanced)
  // ------------------------------
  async retrieveProduct(productId: string): Promise<Stripe.Product> {
    return this.handleStripeOperation(
      () => this.stripe.products.retrieve(productId),
      'retrieve',
      'product'
    );
  }

  async updateProduct(
    productId: string,
    params: Stripe.ProductUpdateParams
  ): Promise<Stripe.Product> {
    return this.handleStripeOperation(
      () => this.stripe.products.update(productId, params),
      'update',
      'product'
    );
  }

  async deleteProduct(productId: string): Promise<Stripe.DeletedProduct> {
    return this.handleStripeOperation(
      () => this.stripe.products.del(productId),
      'delete',
      'product'
    );
  }

  async listProducts(params?: Stripe.ProductListParams): Promise<Stripe.ApiList<Stripe.Product>> {
    return this.handleStripeOperation(() => this.stripe.products.list(params), 'list', 'product');
  }

  async searchProducts(
    params: Stripe.ProductSearchParams
  ): Promise<Stripe.ApiSearchResult<Stripe.Product>> {
    return this.handleStripeOperation(
      () => this.stripe.products.search(params),
      'search',
      'product'
    );
  }

  // ------------------------------
  // Price Operations (enhanced)
  // ------------------------------
  async retrievePrice(priceId: string): Promise<Stripe.Price> {
    return this.handleStripeOperation(
      () => this.stripe.prices.retrieve(priceId),
      'retrieve',
      'price'
    );
  }

  async updatePrice(priceId: string, params: Stripe.PriceUpdateParams): Promise<Stripe.Price> {
    return this.handleStripeOperation(
      () => this.stripe.prices.update(priceId, params),
      'update',
      'price'
    );
  }

  async listPrices(params?: Stripe.PriceListParams): Promise<Stripe.ApiList<Stripe.Price>> {
    return this.handleStripeOperation(() => this.stripe.prices.list(params), 'list', 'price');
  }

  async searchPrices(
    params: Stripe.PriceSearchParams
  ): Promise<Stripe.ApiSearchResult<Stripe.Price>> {
    return this.handleStripeOperation(() => this.stripe.prices.search(params), 'search', 'price');
  }

  // ------------------------------
  // Invoice Operations (enhanced)
  // ------------------------------
  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.retrieve(invoiceId),
      'retrieve',
      'invoice'
    );
  }

  async updateInvoice(
    invoiceId: string,
    params: Stripe.InvoiceUpdateParams
  ): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.update(invoiceId, params),
      'update',
      'invoice'
    );
  }

  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.finalizeInvoice(invoiceId),
      'confirm',
      'invoice'
    );
  }

  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.pay(invoiceId),
      'confirm',
      'invoice'
    );
  }

  async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.sendInvoice(invoiceId),
      'confirm',
      'invoice'
    );
  }

  async voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.voidInvoice(invoiceId),
      'delete',
      'invoice'
    );
  }

  async listInvoices(params?: Stripe.InvoiceListParams): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return this.handleStripeOperation(() => this.stripe.invoices.list(params), 'list', 'invoice');
  }

  async searchInvoices(
    params: Stripe.InvoiceSearchParams
  ): Promise<Stripe.ApiSearchResult<Stripe.Invoice>> {
    return this.handleStripeOperation(
      () => this.stripe.invoices.search(params),
      'search',
      'invoice'
    );
  }

  // ------------------------------
  // Checkout Session Operations (new)
  // ------------------------------
  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams
  ): Promise<Stripe.Checkout.Session> {
    return this.handleStripeOperation(
      () => this.stripe.checkout.sessions.create(params),
      'create',
      'checkout_session'
    );
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.handleStripeOperation(
      () => this.stripe.checkout.sessions.retrieve(sessionId),
      'retrieve',
      'checkout_session'
    );
  }

  async expireCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.handleStripeOperation(
      () => this.stripe.checkout.sessions.expire(sessionId),
      'delete',
      'checkout_session'
    );
  }

  async listCheckoutSessions(
    params?: Stripe.Checkout.SessionListParams
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return this.handleStripeOperation(
      () => this.stripe.checkout.sessions.list(params),
      'list',
      'checkout_session'
    );
  }

  // ------------------------------
  // Coupon & Promotion Code Operations (new)
  // ------------------------------
  async createCoupon(params: Stripe.CouponCreateParams): Promise<Stripe.Coupon> {
    return this.handleStripeOperation(() => this.stripe.coupons.create(params), 'create', 'coupon');
  }

  async createPromotionCode(
    params: Stripe.PromotionCodeCreateParams
  ): Promise<Stripe.PromotionCode> {
    return this.handleStripeOperation(
      () => this.stripe.promotionCodes.create(params),
      'create',
      'promotion_code'
    );
  }

  // ------------------------------
  // Refund Operations (new)
  // ------------------------------
  async createRefund(params: Stripe.RefundCreateParams): Promise<Stripe.Refund> {
    return this.handleStripeOperation(() => this.stripe.refunds.create(params), 'create', 'refund');
  }

  async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
    return this.handleStripeOperation(
      () => this.stripe.refunds.retrieve(refundId),
      'retrieve',
      'refund'
    );
  }

  async updateRefund(refundId: string, params: Stripe.RefundUpdateParams): Promise<Stripe.Refund> {
    return this.handleStripeOperation(
      () => this.stripe.refunds.update(refundId, params),
      'update',
      'refund'
    );
  }

  async listRefunds(params?: Stripe.RefundListParams): Promise<Stripe.ApiList<Stripe.Refund>> {
    return this.handleStripeOperation(() => this.stripe.refunds.list(params), 'list', 'refund');
  }
  private createAppError(
    message: string,
    statusCode: HttpStatusCode,
    errorCode: ErrorCode,
    metadata?: Record<string, unknown>
  ): never {
    throw new HttpException(message, statusCode, { errorCode, metadata });
  }
}
export default new StripeService();
