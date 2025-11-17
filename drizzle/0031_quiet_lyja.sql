CREATE TABLE "services" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"service_description" text NOT NULL,
	"service_icon" varchar(500) NOT NULL,
	"care_type" varchar(50) NOT NULL,
	"title_1" varchar(255) NOT NULL,
	"description_1" text NOT NULL,
	"title_2" varchar(255) NOT NULL,
	"description_2" text NOT NULL,
	"title_3" varchar(255) NOT NULL,
	"description_3" text NOT NULL,
	"description_3_image" varchar(500) NOT NULL,
	"description_3_list" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
