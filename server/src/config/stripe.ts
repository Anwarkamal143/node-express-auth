// src/config/stripe.ts
import { StripeConfig } from '@/types/stripe';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

export const getStripe = (config?: StripeConfig) =>
  new Stripe(stripeSecretKey, {
    ...config,
    apiVersion: '2025-07-30.basil', // Use latest API version
    typescript: true,
  });
