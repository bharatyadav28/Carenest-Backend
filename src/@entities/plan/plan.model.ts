import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { z } from "zod";

import { min_timestamps } from "../../helpers/columns";
import { integer } from "drizzle-orm/pg-core";

export const PlanModel = pgTable("plan", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(21)),

  type: varchar("type", { length: 50 }).notNull(),

  amount: integer("amount").notNull(),

  duration: integer("duration").notNull(),

  ...min_timestamps,
});

export const createPlanSchema = z.object({
  type: z.string().trim().max(50),
  amount: z.number().int().positive(),
  duration: z.number().int().positive(),
});
