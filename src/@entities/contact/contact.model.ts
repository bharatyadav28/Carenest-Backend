import { pgTable, varchar, text } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const ContactModel = pgTable("contact", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Phone Number
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),

  // Email ID
  email: varchar("email", { length: 255 }).notNull(),

  // Address
  address: text("address").notNull(),

  // Business Hours
  businessHours: varchar("business_hours", { length: 100 }).notNull(),

  ...min_timestamps,
});

export const createContactSchema = z.object({
  phoneNumber: z.string().trim().min(1).max(20),
  email: z.string().email(),
  address: z.string().trim().min(1),
  businessHours: z.string().trim().min(1).max(100),
});

export const updateContactSchema = createContactSchema.partial();