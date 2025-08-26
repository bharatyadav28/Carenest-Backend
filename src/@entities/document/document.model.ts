import { pgTable, varchar, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { UserModel } from "../user/user.model";

export const docTypeEnum = pgEnum("docType", ["resume", "work_permit"]);

export const DocumentModel = pgTable("document", {
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

export const createDocumentSchema = z.object({
  type: z.enum(["resume", "work_permit"]).default("work_permit"),
  fileUrl: z.string().trim().max(255).url(),
});
