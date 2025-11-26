CREATE TABLE "caregiver_applications" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"gender" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"zipcode" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"is_reviewed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "veterans_home_care" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"title_1" varchar(255) NOT NULL,
	"description_1" text NOT NULL,
	"image_1" varchar(500) NOT NULL,
	"image_2" varchar(500) NOT NULL,
	"image_3" varchar(500) NOT NULL,
	"title_2" varchar(255) NOT NULL,
	"description_2" text NOT NULL,
	"title_3" varchar(255) NOT NULL,
	"points" jsonb,
	"section_image" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
