CREATE TABLE "faqs" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"faq_type" varchar(100) NOT NULL,
	"section_title" varchar(255),
	"faq_items" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
