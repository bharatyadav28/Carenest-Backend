import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for social links
const socialLinkSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  platform: z.string().trim().min(1).max(50),
  url: z.string().url(),
  icon: z.string().trim().min(1), // Add icon field
});

export const FooterModel = pgTable("footer", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Footer Description
  footerDescription: text("footer_description").notNull(),

  // Locations Array - Using native PostgreSQL array instead of jsonb
  locations: varchar("locations", { length: 255 }).array(),

  // Social Links Array - Keep as jsonb since it's complex objects
  socialLinks: jsonb("social_links").$type<z.infer<typeof socialLinkSchema>[]>(),

  ...min_timestamps,
});

export const createFooterSchema = z.object({
  footerDescription: z.string().trim().min(1),
  locations: z.array(z.string().trim().min(1).max(255)).min(1),
  socialLinks: z.array(socialLinkSchema.omit({ id: true })).min(1),
});

export const updateFooterSchema = createFooterSchema.partial();

// Schemas for individual operations
export const addLocationSchema = z.object({
  location: z.string().trim().min(1).max(255),
});

export const updateLocationSchema = z.object({
  oldLocation: z.string().trim().min(1).max(255),
  newLocation: z.string().trim().min(1).max(255),
});

export const socialLinkInputSchema = z.object({
  platform: z.string().trim().min(1).max(50),
  url: z.string().url(),
  icon: z.string().trim().min(1), // Add icon field to input schema
});