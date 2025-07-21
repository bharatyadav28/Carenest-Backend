import { pgTable, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { UserModel } from "../user";
import { createInsertSchema } from "drizzle-zod";

export const docTypeEnum = pgEnum("docType", [
  "resume",
  "work_permit",
  "admin",
]);

export const documentModel = pgTable("document", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  type: docTypeEnum("type").default("work_permit"),

  fileUrl: varchar("file_url", { length: 255 }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const createDocumentSchema = createInsertSchema(documentModel).omit({
  id: true,
  userId: true,
  createdAt: true,
});
