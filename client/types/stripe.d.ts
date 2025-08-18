// src/types/stripeTypes.ts
import { Stripe } from "stripe";

export type CustomerParams = Stripe.CustomerCreateParams;
export type PaymentIntentParams = Stripe.PaymentIntentCreateParams;
export type SubscriptionParams = Stripe.SubscriptionCreateParams;
export type Subscription = Stripe.Subscription;
export type PriceParams = Stripe.PriceCreateParams;
export type ProductParams = Stripe.ProductCreateParams;
export type StripeProduct = Stripe.Product;
export type InvoiceParams = Stripe.InvoiceCreateParams;
export type StripeCheckoutSession = Stripe.Checkout.Session;

export interface StripeConfig {
  apiVersion: string;
  maxNetworkRetries?: number;
  timeout?: number;
}
