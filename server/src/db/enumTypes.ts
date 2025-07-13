export enum Role {
  USER = "user",
  ADMIN = "admin",
  GUEST = "guest",
  SUPER_ADMIN = "super_admin",
}
export type IRole = `${Role}`;
export enum ProviderType {
  email = "email",
  google = "google",
  github = "github",
  linkedIn = "linkedIn",
}
export enum AccountType {
  oauth = "oauth",
  email = "email",
}
export type IAccountType = `${AccountType}`;
export enum AccountStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}
export type IAccountStatus = `${AccountStatus}`;
export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}
export type IOrderStatus = `${OrderStatus}`;
export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
}
export type IPaymentStatus = `${PaymentStatus}`;
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  STRIPE = "stripe",
  BANK_TRANSFER = "bank_transfer",
  CASH_ON_DELIVERY = "cash_on_delivery",
}
export type IPaymentMethod = `${PaymentMethod}`;
export enum AssetType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  OTHER = "other",
}
export type IAssetType = `${AssetType}`;

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}
export type IUserStatus = `${UserStatus}`;
export enum ProductVisiblity {
  PUBLIC = "public",
  PRIVATE = "private",
  ARCHIVED = "archived",
}
export type IProductVisiblity = `${ProductVisiblity}`;
