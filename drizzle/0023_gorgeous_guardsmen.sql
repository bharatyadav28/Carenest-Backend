CREATE TABLE "blogs" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"main_image" varchar(500) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"author_name" varchar(255) NOT NULL,
	"author_profile_pic" varchar(500),
	"blog_date" timestamp NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
