import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";
import { min_timestamps } from "../../helpers/columns";
import { text } from "drizzle-orm/pg-core";

export const ServiceModel = pgTable("service", {
  id: varchar("id", { length: 21 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid(21)),

  name: varchar("name", { length: 255 }).notNull(),

  description: text("description").notNull(),

  image: varchar("image", { length: 255 }).notNull(),

  offerings: varchar("offerings", { length: 255 }).array().notNull(),

  targetAudience: varchar("target_audience", { length: 255 }).array().notNull(),

  ...min_timestamps,
});

export const CreateServiceSchema = z.object({
  name: z.string().trim().max(255),
  description: z.string().trim(),
  image: z.string().trim().max(255),
  offerings: z.array(z.string().trim().max(255)),
  targetAudience: z.array(z.string().trim().max(255)),
});
