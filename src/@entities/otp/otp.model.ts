import { varchar, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { min_timestamps } from "../../helpers/columns";
import { UserModel } from "../user/user.model";

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

export const createOTPSchema = z.object({
  userId: z.string().trim().max(21),
  type: z.enum(["account_verification", "password_reset", "two_step_auth"]),
  code: z.string().trim().length(4),
  expiresAt: z.date(),
});
