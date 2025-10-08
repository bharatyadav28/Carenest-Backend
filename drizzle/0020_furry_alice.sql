ALTER TABLE "booking" ALTER COLUMN "meeting_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "meeting_date" SET NOT NULL;