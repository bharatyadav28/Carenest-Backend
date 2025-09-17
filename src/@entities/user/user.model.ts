import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  boolean,
  pgEnum,
  check,
  integer,
} from "drizzle-orm/pg-core";

import { nanoid } from "nanoid";
import { timestamps } from "../../helpers/columns";

export const roleEnum = pgEnum("role", ["user", "giver", "admin"]);

export const UserModel = pgTable(
  "user",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid(21)),

    name: varchar("name", { length: 255 }),

    email: varchar("email", { length: 255 }).notNull(),

    isEmailVerified: boolean("email_verified").notNull().default(false),

    password: varchar("password", { length: 255 }),

    mobile: varchar("mobile", { length: 15 }),

    address: text("address"),

    zipcode: integer("zipcode").notNull(),

    gender: varchar("gender", { length: 255 }),

    role: roleEnum("role").default("user"),

    avatar: varchar("avatar", { length: 255 }),

    requiredBy: varchar("required_by", { length: 21 }),

    ...timestamps,
  },
  (table) => [
    check(
      "valid_email",
      sql`${table.email} ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`
    ),
  ]
);
