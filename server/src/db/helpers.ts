import { boolean, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import {
  AccountType,
  AssetType,
  PaymentMethod,
  PaymentStatus,
  Role,
  UserStatus,
} from './enumTypes';

export const roleEnum = pgEnum('role', [Role.SUPER_ADMIN, Role.ADMIN, Role.USER, Role.GUEST]);

export const accountTypeEnum = pgEnum('account_type', [AccountType.email, AccountType.oauth]);
// export const orderStatusEnum = pgEnum('order_status', [
//   OrderStatus.PENDING,
//   OrderStatus.PROCESSING,

//   OrderStatus.SHIPPED,
//   OrderStatus.DELIVERED,
//   OrderStatus.CANCELLED,
//   OrderStatus.REFUNDED,
// ]);

// Enum for payment status
export const paymentStatusEnum = pgEnum('payment_status', [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

// Enum for payment method
export const paymentMethodEnum = pgEnum('payment_method', [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.PAYPAL,
  PaymentMethod.STRIPE,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CASH_ON_DELIVERY,
]);
export const assetTypeEnum = pgEnum('asset_type', [
  AssetType.IMAGE,

  AssetType.VIDEO,
  AssetType.AUDIO,
  AssetType.DOCUMENT,
  AssetType.OTHER,
]);
export const userStatusEnum = pgEnum('user_status', [
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.DELETED,
  UserStatus.INACTIVE,
]);

// export const productVisiblityEnum = pgEnum('product_visibility', [
//   ProductVisiblity.PUBLIC,
//   ProductVisiblity.PRIVATE,
//   ProductVisiblity.ARCHIVED,
// ]);
export const is_active = boolean('is_active').default(true).notNull();

export const time_stamps = {
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
};
