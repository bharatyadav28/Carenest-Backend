CREATE TABLE "testimonials" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"profile_pic" varchar(500),
	"name" varchar(255) NOT NULL,
	"profession" varchar(255) NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
