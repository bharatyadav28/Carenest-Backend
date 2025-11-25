import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for points in section 2
const pointSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  heading: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  icon: z.string().url(),
});

// Schema for testimonials in section 3
const testimonialSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  description: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
});

export const BecomeCaregiverModel = pgTable("become_caregiver", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Section 1: Title and Description
  title1: varchar("title_1", { length: 255 }).notNull(),
  description1: text("description_1").notNull(),

  // Section 2: Title and 6 Points
  title2: varchar("title_2", { length: 255 }).notNull(),
  points: jsonb("points").$type<z.infer<typeof pointSchema>[]>(),

  // Section 3: Testimonials
  title3: varchar("title_3", { length: 255 }).notNull(),
  testimonials: jsonb("testimonials").$type<z.infer<typeof testimonialSchema>[]>(),

  // Testimonial Images
  testImage1: varchar("test_image_1", { length: 500 }).notNull(),
  testImage2: varchar("test_image_2", { length: 500 }).notNull(),

  ...min_timestamps,
});

export const createBecomeCaregiverSchema = z.object({
  title1: z.string().trim().min(1).max(255),
  description1: z.string().trim().min(1),
  title2: z.string().trim().min(1).max(255),
  points: z.array(z.object({
    heading: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1),
    icon: z.string().url(),
  })).length(6, "Exactly 6 points are required"),
  title3: z.string().trim().min(1).max(255),
  testimonials: z.array(z.object({
    description: z.string().trim().min(1),
    name: z.string().trim().min(1).max(255),
  })).min(1),
  testImage1: z.string().url(),
  testImage2: z.string().url(),
});

export const updateBecomeCaregiverSchema = createBecomeCaregiverSchema.partial();

// Schemas for individual operations
export const addPointSchema = z.object({
  heading: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  icon: z.string().url(),
});

export const addTestimonialSchema = z.object({
  description: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
});