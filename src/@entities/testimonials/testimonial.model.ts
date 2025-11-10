import { pgTable, varchar, text, integer, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const TestimonialModel = pgTable("testimonials", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  profilePic: varchar("profile_pic", { length: 500 }),

  name: varchar("name", { length: 255 }).notNull(),

  profession: varchar("profession", { length: 255 }).notNull(),

  rating: integer("rating").notNull().default(0),

  description: text("description").notNull(),

  ...min_timestamps,
});

export const createTestimonialSchema = z.object({
  profilePic: z.string().url().optional().or(z.literal("")),
  name: z.string().trim().min(1).max(255),
  profession: z.string().trim().min(1).max(255),
  rating: z.number().int().min(1).max(5),
  description: z.string().trim().min(1),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();