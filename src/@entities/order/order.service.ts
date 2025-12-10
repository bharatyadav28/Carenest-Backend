import { eq, desc, and, gte, lt, or, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { OrderModel } from "./order.model";
import { PlanModel } from "../plan/plan.model";
import { TransactionModel } from "./transaction.model";
import { UserModel } from "../user/user.model";

export const createOrder = async (data: {
  userId: string;
  planId: string;
  stripeSessionId: string;
  amount: number;
}) => {
  const [order] = await db
    .insert(OrderModel)
    .values({
      ...data,
      currency: "usd",
      status: "pending"
    })
    .returning();
  
  return order;
};

export const getOrderById = async (orderId: string) => {
  const [order] = await db
    .select({
      order: OrderModel,
      plan: PlanModel,
    })
    .from(OrderModel)
    .where(eq(OrderModel.id, orderId))
    .leftJoin(PlanModel, eq(OrderModel.planId, PlanModel.id))
    .limit(1);
  
  return order;
};

export const getOrderBySessionId = async (sessionId: string) => {
  const [order] = await db
    .select()
    .from(OrderModel)
    .where(eq(OrderModel.stripeSessionId, sessionId))
    .limit(1);
  
  return order;
};

export const getUserOrders = async (userId: string, page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit;
  
  const orders = await db
    .select({
      id: OrderModel.id,
      amount: OrderModel.amount,
      status: OrderModel.status,
      createdAt: OrderModel.createdAt,
      subscriptionStartDate: OrderModel.subscriptionStartDate,
      subscriptionEndDate: OrderModel.subscriptionEndDate,
      planType: PlanModel.type,
      planDuration: PlanModel.duration,
    })
    .from(OrderModel)
    .where(eq(OrderModel.userId, userId))
    .leftJoin(PlanModel, eq(OrderModel.planId, PlanModel.id))
    .orderBy(desc(OrderModel.createdAt))
    .limit(limit)
    .offset(offset);
  
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(OrderModel)
    .where(eq(OrderModel.userId, userId));
  
  return { 
    orders, 
    total: Number(count), 
    page, 
    totalPages: Math.ceil(Number(count) / limit) 
  };
};

export const updateOrderStatus = async (sessionId: string, data: Partial<typeof OrderModel.$inferInsert>) => {
  const [updatedOrder] = await db
    .update(OrderModel)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(OrderModel.stripeSessionId, sessionId))
    .returning();
  
  return updatedOrder;
};

export const getUserActiveSubscription = async (userId: string) => {
  const [subscription] = await db
    .select({
      order: OrderModel,
      plan: PlanModel,
    })
    .from(OrderModel)
    .where(
      and(
        eq(OrderModel.userId, userId),
        eq(OrderModel.status, 'completed'),
        or(
          gte(OrderModel.subscriptionEndDate, new Date()),
          isNull(OrderModel.subscriptionEndDate)
        )
      )
    )
    .leftJoin(PlanModel, eq(OrderModel.planId, PlanModel.id))
    .orderBy(desc(OrderModel.createdAt))
    .limit(1);
  
  return subscription;
};

export const createTransaction = async (data: {
  orderId: string;
  stripeEventId: string;
  stripeEventType: string;
  amount: number;
  status: string;
  metadata?: any;
}) => {
  const [transaction] = await db
    .insert(TransactionModel)
    .values({
      ...data,
      currency: "usd"
    })
    .returning();
  
  return transaction;
};

export const getUserTransactions = async (userId: string, page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit;
  
  const transactions = await db
    .select({
      id: TransactionModel.id,
      amount: TransactionModel.amount,
      status: TransactionModel.status,
      stripeEventType: TransactionModel.stripeEventType,
      createdAt: TransactionModel.createdAt,
      orderId: TransactionModel.orderId,
    })
    .from(TransactionModel)
    .innerJoin(OrderModel, eq(TransactionModel.orderId, OrderModel.id))
    .where(eq(OrderModel.userId, userId))
    .orderBy(desc(TransactionModel.createdAt))
    .limit(limit)
    .offset(offset);
  
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(TransactionModel)
    .innerJoin(OrderModel, eq(TransactionModel.orderId, OrderModel.id))
    .where(eq(OrderModel.userId, userId));
  
  return { 
    transactions, 
    total: Number(count), 
    page, 
    totalPages: Math.ceil(Number(count) / limit) 
  };
};