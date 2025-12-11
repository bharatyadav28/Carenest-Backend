import { pgTable, varchar, integer, text, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { min_timestamps } from "../../helpers/columns";

export const PlanModel = pgTable("subscriptionplan", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid(21)),

  name: varchar("name", { length: 100 }).notNull(), // "Monthly Plan"
  description: text("description"),

  amount: integer("amount").notNull(), // 1000 = $10.00
  interval: varchar("interval", { length: 20 }).notNull(), // "month"

  // Stripe IDs
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),

  isActive: boolean("is_active").default(true),

  ...min_timestamps,
});