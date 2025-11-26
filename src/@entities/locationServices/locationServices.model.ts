import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for service items
const serviceItemSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  title: z.string().trim().min(1).max(255),
  items: z.array(z.string().trim().min(1)).min(1),
  image: z.string().url(),
});

export const LocationServicesModel = pgTable("location_services", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Location Information
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),

  // Hero Section
  heroTitle: varchar("hero_title", { length: 255 }).notNull(),
  heroImage: varchar("hero_image", { length: 500 }).notNull(),
  heroDescription: text("hero_description").notNull(),

  // Why Choose Section
  whyChooseTitle: varchar("why_choose_title", { length: 255 }).notNull(),
  whyChooseDescription: text("why_choose_description").notNull(),

  // Services Section
  servicesIntro: varchar("services_intro", { length: 255 }).notNull(),
  servicesDescription: text("services_description").notNull(),
  services: jsonb("services").$type<z.infer<typeof serviceItemSchema>[]>(),

  // Care Designed Section
  careDesignedTitle: varchar("care_designed_title", { length: 255 }).notNull(),
  careDesignedDescription: text("care_designed_description").notNull(),
  careDesignedImage: varchar("care_designed_image", { length: 500 }).notNull(),

  // Proudly Serving Section
  proudlyServingTitle: varchar("proudly_serving_title", { length: 255 }).notNull(),
  proudlyServingDescription: text("proudly_serving_description").notNull(),

  // Steady Partner Section
  steadyPartnerTitle: varchar("steady_partner_title", { length: 255 }).notNull(),
  steadyPartnerDescription: text("steady_partner_description").notNull(),

  ...min_timestamps,
});

export const createLocationServiceSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  heroTitle: z.string().trim().min(1).max(255),
  heroImage: z.string().url(),
  heroDescription: z.string().trim().min(1),
  whyChooseTitle: z.string().trim().min(1).max(255),
  whyChooseDescription: z.string().trim().min(1),
  servicesIntro: z.string().trim().min(1).max(255),
  servicesDescription: z.string().trim().min(1),
  services: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    items: z.array(z.string().trim().min(1)).min(1),
    image: z.string().url(),
  })).min(1),
  careDesignedTitle: z.string().trim().min(1).max(255),
  careDesignedDescription: z.string().trim().min(1),
  careDesignedImage: z.string().url(),
  proudlyServingTitle: z.string().trim().min(1).max(255),
  proudlyServingDescription: z.string().trim().min(1),
  steadyPartnerTitle: z.string().trim().min(1).max(255),
  steadyPartnerDescription: z.string().trim().min(1),
});

export const updateLocationServiceSchema = createLocationServiceSchema.partial();

// Schema for adding/updating services
export const serviceInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  items: z.array(z.string().trim().min(1)).min(1),
  image: z.string().url(),
});