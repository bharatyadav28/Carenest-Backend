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

import { z } from "zod";
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

    ...timestamps,
  },
  (table) => [
    check(
      "valid_email",
      sql`${table.email} ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`
    ),
  ]
);

// Replace with manual Zod schemas - no circular references
export const createUserSchema = z.object({
  name: z.string().trim().max(255).optional(),
  email: z.string().trim().email().max(255),
  isEmailVerified: z.boolean().default(false),
  password: z.string().trim().min(6).max(255).optional(),
  mobile: z.string().trim().max(15).optional(),
  address: z.string().trim().optional(),
  gender: z.string().trim().max(255).optional(),
  role: z.enum(["user", "giver", "admin"]).default("user"),
  avatar: z.string().trim().max(255).optional(),
  zipcode: z.number().int(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().max(255).optional(),
  gender: z.string().trim().max(255).optional(),
  address: z.string().trim().optional(),
  mobile: z.string().trim().max(15).optional(),
  zipcode: z.number().int().optional(),
});

export const signinUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().trim().min(1).max(255),
});
