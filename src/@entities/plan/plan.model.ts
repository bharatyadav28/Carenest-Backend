import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { min_timestamps } from "../../helpers/columns";
import { createInsertSchema } from "drizzle-zod";
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

export const createPlanSchema = createInsertSchema(PlanModel).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
