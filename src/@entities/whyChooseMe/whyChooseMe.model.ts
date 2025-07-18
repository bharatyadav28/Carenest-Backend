import { varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { UserModel } from "../user";
import { min_timestamps } from "../../helpers/columns";
import { createInsertSchema } from "drizzle-zod";

export const whyChooseMeModel = pgTable("why_choose_me", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  title: varchar("title", { length: 255 }).notNull(),

  description: varchar("description", { length: 1000 }).notNull(),

  ...min_timestamps,
});

export const whyChooseMeCreateSchema = createInsertSchema(
  whyChooseMeModel
).omit({
  id: true,
  userId: true,
});
