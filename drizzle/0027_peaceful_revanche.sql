CREATE TABLE "policies" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "policies_type_unique" UNIQUE("type")
);
