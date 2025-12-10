import { pgTable, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { PlanModel } from "../plan/plan.model";
import { UserModel } from "../user/user.model";
import { min_timestamps } from "../../helpers/columns";

export const OrderModel = pgTable("order", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid(21)),

  userId: varchar("user_id", { length: 21 })
    .notNull()
    .references(() => UserModel.id, { onDelete: "cascade" }),

  planId: varchar("plan_id", { length: 21 })
    .notNull()
    .references(() => PlanModel.id, { onDelete: "cascade" }),

  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd"),
  
  status: varchar("status", { length: 20 })
    .default("pending")
    .notNull(), // pending, completed, failed, cancelled, expired
  
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  
  metadata: jsonb("metadata"),
  
  ...min_timestamps,
});

export const orderRelations = relations(OrderModel, ({ one }) => ({
  plan: one(PlanModel, {
    fields: [OrderModel.planId],
    references: [PlanModel.id],
  }),
  user: one(UserModel, {
    fields: [OrderModel.userId],
    references: [UserModel.id],
  }),
}));

export const createOrderSchema = z.object({
  priceID: z.string().min(1, "Plan ID is required"),
});

export const updateOrderSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "cancelled", "expired"]).optional(),
  subscriptionStartDate: z.date().optional(),
  subscriptionEndDate: z.date().optional(),
});