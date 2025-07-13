CREATE TYPE "public"."account_type" AS ENUM('email', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video', 'audio', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'cash_on_delivery');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'user', 'guest');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted', 'inactive');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"surrogate_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "account_type" NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"expires_at" integer,
	"token_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"surrogate_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"company" varchar(255),
	"address1" varchar(255) NOT NULL,
	"address2" varchar(255),
	"city" varchar(255) NOT NULL,
	"state" varchar(255) NOT NULL,
	"postal_code" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"phone" varchar(255),
	"is_default" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"role" "role" DEFAULT 'user',
	"image" text,
	"status" "user_status" DEFAULT 'active',
	"surrogate_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");