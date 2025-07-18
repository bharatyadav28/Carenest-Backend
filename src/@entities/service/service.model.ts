import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { min_timestamps } from "../../helpers/columns";
import { createInsertSchema } from "drizzle-zod";
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

export const CreateServiceSchema = createInsertSchema(ServiceModel).omit({
  id: true,
});
