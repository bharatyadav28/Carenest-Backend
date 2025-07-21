CREATE TABLE "plan" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
