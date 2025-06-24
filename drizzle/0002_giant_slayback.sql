ALTER TABLE "test-user3" DROP CONSTRAINT "valid_email";--> statement-breakpoint
ALTER TABLE "test-user3" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "test-user3" ADD CONSTRAINT "valid_email" CHECK ("test-user3"."email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');