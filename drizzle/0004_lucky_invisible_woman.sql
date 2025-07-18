CREATE TABLE "service" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"image" varchar(255) NOT NULL,
	"offerings" varchar(1000)[] NOT NULL,
	"target_audience" varchar(1000)[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
