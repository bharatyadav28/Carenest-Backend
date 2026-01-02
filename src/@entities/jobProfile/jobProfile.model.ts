import { pgTable, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { UserModel } from "../user/user.model";
import { min_timestamps } from "../../helpers/columns";

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

  maxPrice: integer("max_price").notNull().default(1),

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

export const createJobProfileSchema = z.object({
  caregivingType: z.string().trim().max(255),
  minPrice: z.number().int().min(0).default(0),
  maxPrice: z.number().int().default(1),
  locationRange: z.string().trim().max(255),
  experienceMin: z.number().int().min(0).default(0),
  experienceMax: z.number().int().positive(),
  certified: z.boolean().default(false),
  languages: z.array(z.string().trim().max(255)).optional(),
  prnMin: z.number().int().min(0).default(0),
  prnMax: z.number().int().min(0).default(0),
  isPrn: z.boolean().default(false),
});
