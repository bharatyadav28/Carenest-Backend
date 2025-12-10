import { pgTable, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import { OrderModel } from "./order.model";
import { min_timestamps } from "../../helpers/columns";

export const TransactionModel = pgTable("transaction", {
  id: varchar("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid(21)),

  orderId: varchar("order_id", { length: 21 })
    .notNull()
    .references(() => OrderModel.id, { onDelete: "cascade" }),

  stripeEventId: varchar("stripe_event_id", { length: 255 }),
  stripeEventType: varchar("stripe_event_type", { length: 100 }),
  
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd"),
  status: varchar("status", { length: 20 }).notNull(),
  
  metadata: jsonb("metadata"),
  
  ...min_timestamps,
});

export const transactionRelations = relations(TransactionModel, ({ one }) => ({
  order: one(OrderModel, {
    fields: [TransactionModel.orderId],
    references: [OrderModel.id],
  }),
}));