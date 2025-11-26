import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const VeteransHomeCareModel = pgTable("veterans_home_care", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Section 1: Title and Description
  title1: varchar("title_1", { length: 255 }).notNull(),
  description1: text("description_1").notNull(),

  // Section 2: 3 Different Images
  image1: varchar("image_1", { length: 500 }).notNull(),
  image2: varchar("image_2", { length: 500 }).notNull(),
  image3: varchar("image_3", { length: 500 }).notNull(),

  // Section 3: Title and Description
  title2: varchar("title_2", { length: 255 }).notNull(),
  description2: text("description_2").notNull(),

  // Section 4: Title and List of Points with Image
  title3: varchar("title_3", { length: 255 }).notNull(),
  points: jsonb("points").$type<string[]>(), // Array of points
  sectionImage: varchar("section_image", { length: 500 }).notNull(), // Image at right side

  ...min_timestamps,
});

export const createVeteransHomeCareSchema = z.object({
  title1: z.string().trim().min(1).max(255),
  description1: z.string().trim().min(1),
  image1: z.string().url(),
  image2: z.string().url(),
  image3: z.string().url(),
  title2: z.string().trim().min(1).max(255),
  description2: z.string().trim().min(1),
  title3: z.string().trim().min(1).max(255),
  points: z.array(z.string().trim().min(1)).min(1),
  sectionImage: z.string().url(),
});

export const updateVeteransHomeCareSchema = createVeteransHomeCareSchema.partial();

// Schema for adding/updating points
export const updatePointsSchema = z.object({
  points: z.array(z.string().trim().min(1)).min(1),
});