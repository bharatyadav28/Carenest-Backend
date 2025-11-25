CREATE TABLE "become_caregiver" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"title_1" varchar(255) NOT NULL,
	"description_1" text NOT NULL,
	"title_2" varchar(255) NOT NULL,
	"points" jsonb,
	"title_3" varchar(255) NOT NULL,
	"testimonials" jsonb,
	"test_image_1" varchar(500) NOT NULL,
	"test_image_2" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
