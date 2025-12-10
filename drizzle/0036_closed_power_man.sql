ALTER TABLE "user" ADD COLUMN "has_subscription" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_plan_id" varchar(21);