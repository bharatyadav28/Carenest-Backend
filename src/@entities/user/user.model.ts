import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  boolean,
  pgEnum,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { timestamps } from "../../helpers/columns";

export const roleEnum = pgEnum("role", ["user", "giver", "admin"]);

export const userModel = pgTable(
  "test-user3",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid(21)),

    name: varchar("name", { length: 255 }).notNull(),

    email: varchar("email", { length: 255 }).notNull(),

    password: varchar("password", { length: 255 }).notNull(),

    mobile: varchar("mobile", { length: 15 }).notNull(),

    address: text("address"),

    gender: varchar("gender", { length: 255 }),

    role: roleEnum().default("user"),

    ...timestamps,
  },
  (table) => [
    check(
      "valid_email",
      sql`${table.email} ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`
    ),
  ]
);

export const createUserSchema = createInsertSchema(userModel).omit({
  id: true,
});

export const signinUserSchema = createInsertSchema(userModel).pick({
  email: true,
  password: true,
});

export default userModel;
