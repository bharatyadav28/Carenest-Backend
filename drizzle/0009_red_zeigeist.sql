CREATE TYPE "public"."booking_status" AS ENUM('pending', 'active', 'completed', 'cancel');--> statement-breakpoint
CREATE TABLE "booking_caregiver" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"booking_id" varchar(21) NOT NULL,
	"caregiver_id" varchar(21) NOT NULL,
	"is_users_choice" boolean DEFAULT true,
	"is_final_selection" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"appointment_date" date NOT NULL,
	"service_id" varchar(21) NOT NULL,
	"duration_in_days" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending',
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"cancelled_by" varchar(21),
	"cancelledByType" "role",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_caregiver" ADD CONSTRAINT "booking_caregiver_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_caregiver" ADD CONSTRAINT "booking_caregiver_caregiver_id_user_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;