import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { UserModel } from "../user/user.model";
import { timestamps } from "../../helpers/columns";

export const ConversationModel = pgTable("conversations", {
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

  ...timestamps,
});

export const MessageModel = pgTable("messages", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  conversationId: varchar("conversation_id", { length: 21 })
    .notNull()
    .references(() => ConversationModel.id),

  fromUserId: varchar("from_user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  message: text("message").notNull(),

  hasRead: boolean("has_read").default(false),

  readAt: timestamp("read_at"),

  ...timestamps,
});
