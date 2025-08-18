// src/routes/stripe.routes.ts
import * as checkoutController from '@/controllers/stripe/checkout.controller';
import * as customerController from '@/controllers/stripe/customer.controller';
import * as invoiceController from '@/controllers/stripe/invoice.controller';
import * as paymentIntentController from '@/controllers/stripe/paymentIntent.controller';
import * as paymentMethodController from '@/controllers/stripe/paymentMethod.controller';
import * as productController from '@/controllers/stripe/product.controller';
import * as subscriptionController from '@/controllers/stripe/subscription.controller';
// import * as webhookController from '@/controllers/stripe/webhook.controller';
import { StripeWebhook } from '@/webhooks/stripe.hooks';
import express from 'express';
const stripeWebHooks = new StripeWebhook();

const router = express.Router();

// ------------------------------
// Customer Routes
// ------------------------------
router.post('/customers', customerController.createCustomer);
router.get('/customers/:customerId', customerController.getCustomer);
router.put('/customers/:customerId', customerController.updateCustomer);
router.delete('/customers/:customerId', customerController.deleteCustomer);
router.get('/customers', customerController.listCustomers);
router.post('/customers/search', customerController.searchCustomers);

// ------------------------------
// Payment Method Routes
// ------------------------------
router.post('/payment-methods/attach', paymentMethodController.attachPaymentMethod);
router.post(
  '/payment-methods/:paymentMethodId/detach',
  paymentMethodController.detachPaymentMethod
);
router.get(
  '/customers/:customerId/payment-methods',
  paymentMethodController.listCustomerPaymentMethods
);

// ------------------------------
// Payment Intent Routes
// ------------------------------
router.post('/payment-intents', paymentIntentController.createPaymentIntent);
router.post(
  '/payment-intents/:paymentIntentId/confirm',
  paymentIntentController.confirmPaymentIntent
);
router.post(
  '/payment-intents/:paymentIntentId/capture',
  paymentIntentController.capturePaymentIntent
);
router.post(
  '/payment-intents/:paymentIntentId/cancel',
  paymentIntentController.cancelPaymentIntent
);
router.get('/payment-intents/:paymentIntentId', paymentIntentController.getPaymentIntent);
router.get('/payment-intents', paymentIntentController.listPaymentIntents);

// ------------------------------
// Subscription Routes
// ------------------------------
router.post('/subscriptions', subscriptionController.createSubscription);
router.get('/subscriptions/:subscriptionId', subscriptionController.getSubscription);
router.put('/subscriptions/:subscriptionId', subscriptionController.updateSubscription);
router.delete('/subscriptions/:subscriptionId', subscriptionController.cancelSubscription);
router.get('/subscriptions', subscriptionController.listSubscriptions);
router.post('/subscriptions/search', subscriptionController.searchSubscriptions);

// ------------------------------
// Product Routes
// ------------------------------
router.post('/products', productController.createProduct);
router.get('/products/:productId', productController.getProduct);
router.put('/products/:productId', productController.updateProduct);
router.delete('/products/:productId', productController.deleteProduct);
router.get('/products', productController.listProducts);
router.post('/products/search', productController.searchProducts);

// ------------------------------
// Price Routes
// ------------------------------
router.post('/prices', productController.createPrice);
router.get('/prices/:priceId', productController.getPrice);
router.put('/prices/:priceId', productController.updatePrice);
router.get('/prices', productController.listPrices);
router.post('/prices/search', productController.searchPrices);

// ------------------------------
// Checkout Session Routes
// ------------------------------
router.post('/checkout-sessions', checkoutController.createCheckoutSession);
router.get('/checkout-sessions/:sessionId', checkoutController.getCheckoutSession);
router.post('/checkout-sessions/:sessionId/expire', checkoutController.expireCheckoutSession);
router.get('/checkout-sessions', checkoutController.listCheckoutSessions);

// ------------------------------
// Invoice Routes
// ------------------------------
router.post('/invoices', invoiceController.createInvoice);
router.get('/invoices/:invoiceId', invoiceController.getInvoice);
router.post('/invoices/:invoiceId/finalize', invoiceController.finalizeInvoice);
router.post('/invoices/:invoiceId/pay', invoiceController.payInvoice);
router.post('/invoices/:invoiceId/send', invoiceController.sendInvoice);
router.post('/invoices/:invoiceId/void', invoiceController.voidInvoice);
router.get('/invoices', invoiceController.listInvoices);
router.post('/invoices/search', invoiceController.searchInvoices);

// ------------------------------
// Webhook Route
// ------------------------------
router.post('/webhooks', express.raw({ type: 'application/json' }), stripeWebHooks.handleWebhook);
// router.post(
//   '/stripe/webhooks',
//   express.raw({ type: 'application/json' }),
//   webhookController.handleWebhook
// );

export default router;
