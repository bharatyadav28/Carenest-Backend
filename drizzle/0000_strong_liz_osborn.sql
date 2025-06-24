CREATE TYPE "public"."role" AS ENUM('user', 'giver', 'admin');--> statement-breakpoint
CREATE TABLE "test-user3" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"address" text,
	"password" varchar(255) NOT NULL,
	"gender" varchar(255),
	"role" "role" DEFAULT 'user',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp
);
