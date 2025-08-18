// src/types/stripeTypes.ts
import { Stripe } from 'stripe';

export type CustomerParams = Stripe.CustomerCreateParams;
export type PaymentIntentParams = Stripe.PaymentIntentCreateParams;
export type SubscriptionParams = Stripe.SubscriptionCreateParams;
export type PriceParams = Stripe.PriceCreateParams;
export type ProductParams = Stripe.ProductCreateParams;
export type InvoiceParams = Stripe.InvoiceCreateParams;

export interface StripeConfig {
  apiVersion: string;
  maxNetworkRetries?: number;
  timeout?: number;
}
