// @entities/notification/notification.model.ts
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { timestamps } from "../../helpers/columns";
import { UserModel } from "../user/user.model";
import { z } from "zod";


export const NotificationType = {
  BOOKING: "booking",
  USER: "user", 
  SYSTEM: "system",
  MESSAGE: "message",
  PAYMENT: "payment"
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationModel = pgTable("notification", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 255 }).notNull(),
  
  description: text("description").notNull(),
  
  type: varchar("type", { length: 50 }).notNull(),
  
  isRead: boolean("is_read").default(false).notNull(),
  
  readAt: timestamp("read_at"),
  

  
  ...timestamps,
});

// Zod schemas for validation
export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  type: z.enum(["booking", "user", "system", "message", "payment"]),

});

export const updateNotificationSchema = createNotificationSchema.partial();