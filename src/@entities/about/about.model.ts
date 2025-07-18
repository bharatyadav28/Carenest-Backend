import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { UserModel } from "../user";
import { min_timestamps } from "../../helpers/columns";
import { createInsertSchema } from "drizzle-zod";

export const AboutModel = pgTable("about", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  content: varchar("content", { length: 255 }).notNull(),

  ...min_timestamps,
});

export const createAboutSchema = createInsertSchema(AboutModel).omit({
  id: true,
  userId: true,
});
