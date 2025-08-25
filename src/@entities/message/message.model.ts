import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { UserModel } from "../user";
import { timestamps } from "../../helpers/columns";

export const Conversation = pgTable("conversations", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  participant1Id: varchar("participant1_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  participant2Id: varchar("participant2_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  lastMessageId: varchar("last_message_id", { length: 21 }),

  lastMessageText: varchar("last_message_text", { length: 500 }),

  lastMessageTime: timestamp("last_message_time").defaultNow(),

  lastMessageSenderId: varchar("last_message_sender_id", { length: 21 }),

  ...timestamps,
});

export const MessageModel = pgTable("messages", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  conversationId: varchar("conversation_id", { length: 21 })
    .notNull()
    .references(() => Conversation.id),

  fromUserId: varchar("from_user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  toUserId: varchar("to_user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  message: text("message").notNull(),

  isRead: boolean("is_read").default(false),

  ...timestamps,
});
