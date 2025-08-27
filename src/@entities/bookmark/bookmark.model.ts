import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { UserModel } from "../user/user.model";

export const BookmarkModel = pgTable("bookmarks", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  giverId: varchar("giver_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
