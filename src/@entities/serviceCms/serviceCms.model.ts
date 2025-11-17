import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Define care types
export const CareType = {
  PERSONAL_CARE: "Personal Care",
  HOME_MAKER: "Home Maker Service",
  SPECIALIZED_CARE: "Specialized Care",
  SITTER_SERVICES: "Sitter Services",
  COMPANION_CARE: "Companion Care",
  TRANSPORTATION: "Transportation"
} as const;

export type CareType = typeof CareType[keyof typeof CareType];

export const ServiceCmsModel = pgTable("services", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Service Basic Info
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  serviceDescription: text("service_description").notNull(),
  serviceIcon: varchar("service_icon", { length: 500 }).notNull(),
  careType: varchar("care_type", { length: 50 }).notNull(),

  // Content Sections
  title1: varchar("title_1", { length: 255 }).notNull(),
  description1: text("description_1").notNull(),

  title2: varchar("title_2", { length: 255 }).notNull(),
  description2: text("description_2").notNull(),

  title3: varchar("title_3", { length: 255 }).notNull(),
  description3: text("description_3").notNull(),
  description3Image: varchar("description_3_image", { length: 500 }).notNull(),
  
  // Array of points for description3
  description3List: jsonb("description_3_list").$type<string[]>(),

  ...min_timestamps,
});

export const createServiceSchema = z.object({
  serviceName: z.string().trim().min(1).max(255),
  serviceDescription: z.string().trim().min(1),
  serviceIcon: z.string().url(),
  careType: z.enum([
    "Personal Care",
    "Home Maker Service", 
    "Specialized Care",
    "Sitter Services",
    "Companion Care",
    "Transportation"
  ]),
  title1: z.string().trim().min(1).max(255),
  description1: z.string().trim().min(1),
  title2: z.string().trim().min(1).max(255),
  description2: z.string().trim().min(1),
  title3: z.string().trim().min(1).max(255),
  description3: z.string().trim().min(1),
  description3Image: z.string().url(),
  description3List: z.array(z.string().trim().min(1)).min(1),
});

export const updateServiceSchema = createServiceSchema.partial();