CREATE TABLE "subscriptionplan" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"interval" varchar(20) NOT NULL,
	"stripe_product_id" varchar(255),
	"stripe_price_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"plan_id" varchar(21) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
DROP TABLE "plan" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_active_subscription" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_subscriptionplan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscriptionplan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "has_subscription";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "subscription_start_date";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "subscription_end_date";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "subscription_plan_id";