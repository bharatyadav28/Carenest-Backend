import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

export const WhoWeAreModel = pgTable("who_we_are", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // First Section: Main Heading & Description
  mainHeading: varchar("main_heading", { length: 255 }).notNull(),
  mainDescription: text("main_description").notNull(),

  // 4 Compulsory Images Array
  images: jsonb("images").$type<string[]>().notNull(),

  // Our Caregiver Network Section
  caregiverNetworkHeading: varchar("caregiver_network_heading", { length: 255 }).notNull(),
  caregiverNetworkDescription: text("caregiver_network_description").notNull(),
  caregiverNetworkImage: varchar("caregiver_network_image", { length: 500 }).notNull(),

  // Our Promise Section
  promiseHeading: varchar("promise_heading", { length: 255 }).notNull(),
  promiseDescription: text("promise_description").notNull(),

  ...min_timestamps,
});

export const createWhoWeAreSchema = z.object({
  mainHeading: z.string().trim().min(1).max(255),
  mainDescription: z.string().trim().min(1),
  images: z.array(z.string().url()).length(4, "Exactly 4 images are required"),
  caregiverNetworkHeading: z.string().trim().min(1).max(255),
  caregiverNetworkDescription: z.string().trim().min(1),
  caregiverNetworkImage: z.string().url(),
  promiseHeading: z.string().trim().min(1).max(255),
  promiseDescription: z.string().trim().min(1),
});

export const updateWhoWeAreSchema = createWhoWeAreSchema.partial();