ALTER TABLE "service" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "offerings" SET DATA TYPE varchar(255)[];--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "target_audience" SET DATA TYPE varchar(255)[];