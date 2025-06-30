CREATE TYPE "public"."role" AS ENUM('user', 'giver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('account_verification', 'password_reset', 'two_step_auth');--> statement-breakpoint
CREATE TABLE "test-user4" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(255),
	"mobile" varchar(15),
	"address" text,
	"gender" varchar(255),
	"role" "role" DEFAULT 'user',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	CONSTRAINT "valid_email" CHECK ("test-user4"."email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"userId" varchar(21) NOT NULL,
	"type" "type" NOT NULL,
	"code" varchar(4) NOT NULL,
	"expires_At" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp" ADD CONSTRAINT "otp_userId_test-user4_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."test-user4"("id") ON DELETE no action ON UPDATE no action;