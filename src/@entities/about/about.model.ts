import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { UserModel } from "../user/user.model";
import { min_timestamps } from "../../helpers/columns";

export const AboutModel = pgTable("about", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  content: varchar("content", { length: 1000 }).notNull(),

  ...min_timestamps,
});

export const createAboutSchema = z.object({
  content: z.string().trim().max(1000),
});
