CREATE TABLE "contact" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"business_hours" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
