import { varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { UserModel } from "../user/user.model";
import { min_timestamps } from "../../helpers/columns";

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

export const whyChooseMeCreateSchema = z.object({
  title: z.string().trim().max(255),
  description: z.string().trim().max(1000),
});
