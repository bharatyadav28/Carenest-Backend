import { pgTable, varchar, text, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const CaregiverApplicationModel = pgTable("caregiver_applications", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Personal Information
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  address: text("address").notNull(),
  zipcode: varchar("zipcode", { length: 20 }).notNull(),

  // Additional Information
  description: text("description").notNull(),

  // Application Status
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, reviewed, approved, rejected
  isReviewed: boolean("is_reviewed").default(false),

  ...min_timestamps,
});

export const createCaregiverApplicationSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  email: z.string().email(),
  phoneNumber: z.string().trim().min(1).max(20),
  gender: z.string().trim().min(1).max(50),
  address: z.string().trim().min(1),
  zipcode: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "approved", "rejected"]),
  isReviewed: z.boolean().optional(),
});