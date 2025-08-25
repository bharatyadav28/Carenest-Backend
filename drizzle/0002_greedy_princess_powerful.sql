CREATE TABLE "conversations" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"participant1_id" varchar(21) NOT NULL,
	"participant2_id" varchar(21) NOT NULL,
	"last_message_id" varchar(21),
	"last_message_text" varchar(500),
	"last_message_time" timestamp DEFAULT now(),
	"last_message_sender_id" varchar(21),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" varchar(21) NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant1_id_user_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant2_id_user_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;