import { pgTable, varchar, text } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const HeroSectionModel = pgTable("hero_section", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  heading: varchar("heading", { length: 255 }).notNull(),

  description: text("description").notNull(),

  googleReviewLink: varchar("google_review_link", { length: 500 }),

  phoneNumber: varchar("phone_number", { length: 20 }),

  ...min_timestamps,
});

export const createHeroSectionSchema = z.object({
  heading: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  googleReviewLink: z.string().url().optional().or(z.literal("")),
  phoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
});

export const updateHeroSectionSchema = createHeroSectionSchema.partial();