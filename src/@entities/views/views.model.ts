import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { UserModel } from "../user/user.model";

export const ViewsModel = pgTable("views", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 }).references(() => UserModel.id),

  giverId: varchar("giver_id", { length: 21 }).references(() => UserModel.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
