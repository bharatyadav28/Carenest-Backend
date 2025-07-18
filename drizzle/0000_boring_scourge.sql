CREATE TYPE "public"."role" AS ENUM('user', 'giver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('account_verification', 'password_reset', 'two_step_auth');--> statement-breakpoint
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
ALTER TABLE "otp" ADD CONSTRAINT "otp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_profile" ADD CONSTRAINT "job_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;