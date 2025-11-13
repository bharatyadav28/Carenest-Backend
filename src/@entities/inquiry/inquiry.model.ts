import { pgTable, varchar, text } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const InquiryModel = pgTable("inquiries", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  description: text("description").notNull(),

  ...min_timestamps,
});

export const createInquirySchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().email(),
  description: z.string().trim().min(1),
});