import { pgTable, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import { UserModel } from "../user/user.model";
import { PlanModel } from "../plan/plan.model";
import { min_timestamps } from "../../helpers/columns";

export const SubscriptionModel = pgTable("subscription", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id, { onDelete: "cascade" }),

  planId: varchar("plan_id", { length: 21 })
    .notNull()
    .references(() => PlanModel.id, { onDelete: "cascade" }),

  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 })
    .notNull()
    .unique(),

  status: varchar("status", { length: 20 })
    .default("active")
    .notNull(), // active, canceled, past_due

  currentPeriodEnd: timestamp("current_period_end").notNull(),
  
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),

  ...min_timestamps,
});

export const subscriptionRelations = relations(SubscriptionModel, ({ one }) => ({
  user: one(UserModel, {
    fields: [SubscriptionModel.userId],
    references: [UserModel.id],
  }),
  plan: one(PlanModel, {
    fields: [SubscriptionModel.planId],
    references: [PlanModel.id],
  }),
}));