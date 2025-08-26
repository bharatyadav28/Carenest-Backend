import { varchar, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { min_timestamps } from "../../helpers/columns";
import { UserModel } from "../user/user.model";
import { createInsertSchema } from "drizzle-zod";

export const typeEnum = pgEnum("type", [
  "account_verification",
  "password_reset",
  "two_step_auth",
]);

export const OtpModel = pgTable("otp", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  type: typeEnum().notNull(),

  code: varchar("code", { length: 4 }).notNull(),

  expiresAt: timestamp("expires_At").notNull(),
  ...min_timestamps,
});

export const createOTPSchema = createInsertSchema(OtpModel).omit({
  id: true,
});
