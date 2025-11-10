CREATE TABLE "about_us" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"main_heading" varchar(255) NOT NULL,
	"main_description" text NOT NULL,
	"key_people" jsonb,
	"values_heading" varchar(255) NOT NULL,
	"our_values" jsonb,
	"mission_description" text NOT NULL,
	"meet_team_heading" varchar(255) NOT NULL,
	"meet_team_description" text NOT NULL,
	"team_members" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
