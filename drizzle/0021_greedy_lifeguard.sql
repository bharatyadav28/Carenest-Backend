CREATE TABLE "hero_section" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"heading" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"google_review_link" varchar(500),
	"phone_number" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
