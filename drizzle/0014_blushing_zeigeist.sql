CREATE TABLE "booking_services" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"booking_id" varchar(21) NOT NULL,
	"service_id" varchar(21) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_weekly_schedule" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"booking_id" varchar(21) NOT NULL,
	"week_day" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_day_check" CHECK ( "booking_weekly_schedule"."week_day" >= 0 AND "booking_weekly_schedule"."week_day" <=6 )
);
--> statement-breakpoint
ALTER TABLE "booking" RENAME COLUMN "appointment_date" TO "start_date";--> statement-breakpoint
ALTER TABLE "booking" DROP CONSTRAINT "booking_service_id_service_id_fk";
--> statement-breakpoint
ALTER TABLE "booking_caregiver" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "booking_caregiver" ALTER COLUMN "status" SET DEFAULT 'shortlisted'::text;--> statement-breakpoint
DROP TYPE "public"."booking_giver_status";--> statement-breakpoint
CREATE TYPE "public"."booking_giver_status" AS ENUM('shortlisted', 'rejected', 'hired', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "booking_caregiver" ALTER COLUMN "status" SET DEFAULT 'shortlisted'::"public"."booking_giver_status";--> statement-breakpoint
ALTER TABLE "booking_caregiver" ALTER COLUMN "status" SET DATA TYPE "public"."booking_giver_status" USING "status"::"public"."booking_giver_status";--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "status" SET DEFAULT 'requested'::text;--> statement-breakpoint
DROP TYPE "public"."booking_status";--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'accepted', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "status" SET DEFAULT 'requested'::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "status" SET DATA TYPE "public"."booking_status" USING "status"::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "zipcode" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "required_by" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "required_by" varchar(21);--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_weekly_schedule" ADD CONSTRAINT "booking_weekly_schedule_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" DROP COLUMN "service_id";--> statement-breakpoint
ALTER TABLE "booking" DROP COLUMN "duration_in_days";