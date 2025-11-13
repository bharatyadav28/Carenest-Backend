CREATE TABLE "footer" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"footer_description" text NOT NULL,
	"locations" varchar(255)[],
	"social_links" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
