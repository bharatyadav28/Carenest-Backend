import { pgTable, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";

// Schema for resource cards
const resourceCardSchema = z.object({
  id: varchar("id", { length: 21 })
    .notNull()
    .$defaultFn(() => nanoid(21)),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  redirectUrl: z.string().url(),
  badges: z.array(z.string().trim().min(1).max(50)).min(1).max(4),
});

export const ResourcesModel = pgTable("resources", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  // Main Section
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),

  // Resource Cards Array
  resourceCards: jsonb("resource_cards").$type<z.infer<typeof resourceCardSchema>[]>(),

  ...min_timestamps,
});

export const createResourcesSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  resourceCards: z.array(resourceCardSchema.omit({ id: true })).min(1),
});

export const updateResourcesSchema = createResourcesSchema.partial();

// Schema for individual resource card operations
export const resourceCardInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  redirectUrl: z.string().url(),
  badges: z.array(z.string().trim().min(1).max(50)).min(1).max(4),
});