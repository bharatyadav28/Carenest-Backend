CREATE TYPE "public"."role" AS ENUM('user', 'giver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('account_verification', 'password_reset', 'two_step_auth');--> statement-breakpoint
CREATE TYPE "public"."docType" AS ENUM('resume', 'work_permit');--> statement-breakpoint
CREATE TYPE "public"."booking_giver_status" AS ENUM('interested', 'rejected', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(255),
	"mobile" varchar(15),
	"address" text,
	"gender" varchar(255),
	"role" "role" DEFAULT 'user',
	"avatar" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	CONSTRAINT "valid_email" CHECK ("user"."email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"type" "type" NOT NULL,
	"code" varchar(4) NOT NULL,
	"expires_At" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_profile" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"caregiving_type" varchar(255) NOT NULL,
	"min_price" integer DEFAULT 0 NOT NULL,
	"max_price" integer NOT NULL,
	"location_range" varchar(255) NOT NULL,
	"experience_min" integer DEFAULT 0 NOT NULL,
	"experience_max" integer NOT NULL,
	"certified" boolean DEFAULT false NOT NULL,
	"languages" varchar(255)[],
	"prn_min" integer DEFAULT 0 NOT NULL,
	"prn_max" integer DEFAULT 0 NOT NULL,
	"is_prn" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "about" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"content" varchar(1000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "why_choose_me" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"image" varchar(255) NOT NULL,
	"offerings" varchar(255)[] NOT NULL,
	"target_audience" varchar(255)[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "my_service" (
	"user_id" varchar(21) NOT NULL,
	"service_id" varchar(21) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"type" "docType" DEFAULT 'work_permit',
	"file_url" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_caregiver" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"booking_id" varchar(21) NOT NULL,
	"caregiver_id" varchar(21) NOT NULL,
	"is_users_choice" boolean DEFAULT true,
	"status" "booking_giver_status" DEFAULT 'interested',
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(21) NOT NULL,
	"appointment_date" date NOT NULL,
	"service_id" varchar(21) NOT NULL,
	"duration_in_days" integer NOT NULL,
	"status" "booking_status" DEFAULT 'requested',
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"cancelled_by" varchar(21),
	"cancelledByType" "role",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp" ADD CONSTRAINT "otp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_profile" ADD CONSTRAINT "job_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "about" ADD CONSTRAINT "about_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "why_choose_me" ADD CONSTRAINT "why_choose_me_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_service" ADD CONSTRAINT "my_service_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_service" ADD CONSTRAINT "my_service_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_caregiver" ADD CONSTRAINT "booking_caregiver_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_caregiver" ADD CONSTRAINT "booking_caregiver_caregiver_id_user_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;