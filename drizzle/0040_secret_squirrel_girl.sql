ALTER TABLE "subscriptionplan" ADD COLUMN "is_latest" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "subscriptionplan" ADD COLUMN "previous_plan_id" varchar(21);