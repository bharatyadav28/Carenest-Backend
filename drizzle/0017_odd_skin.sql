ALTER TABLE "service" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "deleted_at" timestamp;