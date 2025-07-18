CREATE TABLE "my_service" (
	"user_id" varchar(21) NOT NULL,
	"service_id" varchar(21) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "my_service" ADD CONSTRAINT "my_service_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_service" ADD CONSTRAINT "my_service_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;