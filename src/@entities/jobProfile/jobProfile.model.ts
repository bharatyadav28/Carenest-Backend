import { pgTable, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { UserModel } from "../user";
import { min_timestamps } from "../../helpers/columns";
import { createInsertSchema } from "drizzle-zod";

export const JobProfileModel = pgTable("job_profile", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id),

  caregivingType: varchar("caregiving_type", { length: 255 }).notNull(),

  minPrice: integer("min_price").notNull().default(0),

  maxPrice: integer("max_price").notNull(),

  locationRange: varchar("location_range", { length: 255 }).notNull(),

  experienceMin: integer("experience_min").notNull().default(0),

  experienceMax: integer("experience_max").notNull(),

  certified: boolean("certified").notNull().default(false),

  languages: varchar("languages", { length: 255 }).array(),

  prnMin: integer("prn_min").notNull().default(0),

  prnMax: integer("prn_max").notNull().default(0),

  isPrn: boolean("is_prn").default(false),

  ...min_timestamps,
});

export const createJobProfileSchema = createInsertSchema(JobProfileModel).omit({
  id: true,
  userId: true,
});
