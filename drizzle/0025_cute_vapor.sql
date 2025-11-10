CREATE TABLE "who_we_are" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"main_heading" varchar(255) NOT NULL,
	"main_description" text NOT NULL,
	"images" jsonb NOT NULL,
	"caregiver_network_heading" varchar(255) NOT NULL,
	"caregiver_network_description" text NOT NULL,
	"caregiver_network_image" varchar(500) NOT NULL,
	"promise_heading" varchar(255) NOT NULL,
	"promise_description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
