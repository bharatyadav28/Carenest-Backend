import { Request, Response } from "express";
import { getPlanById } from "../plan/plan.service";
import {
  createOrder,
  getUserOrders,
  getUserActiveSubscription,
  getUserTransactions,
  getOrderBySessionId,
  getOrderById,
} from "./order.service";
import { NotFoundError, BadRequestError } from "../../errors";
import { createCheckoutSession, getSubscriptionStatus } from "../../helpers/stripe";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { UserModel } from "../user/user.model";

export const createStripeSession = async (req: Request, res: Response) => {
  const { priceID } = req.body;
  const userId = req.user.id;

  console.log("Creating Stripe session for user:", userId, "plan:", priceID);

  // Check if user already has active subscription
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { hasSubscription: true, subscriptionEndDate: true }
  });

  if (user?.hasSubscription && user.subscriptionEndDate) {
    const endDate = new Date(user.subscriptionEndDate);
    if (endDate > new Date()) {
      throw new BadRequestError("You already have an active subscription");
    }
  }

  const existingPlan = await getPlanById(priceID);
  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  // Create Stripe checkout session
  const session = await createCheckoutSession({
    duration: existingPlan.duration,
    userId,
    planId: existingPlan.id,
    planType: existingPlan.type,
    amount: existingPlan.amount,
  });

  // Create order record in database
  await createOrder({
    userId,
    planId: existingPlan.id,
    stripeSessionId: session.id,
    amount: existingPlan.amount,
  });

  res.status(201).json({
    success: true,
    message: "Checkout session created successfully",
    data: { 
      sessionId: session.id, 
      checkoutUrl: session.url,
      plan: {
        name: existingPlan.type,
        amount: existingPlan.amount,
        duration: existingPlan.duration,
      }
    },
  });
};

export const getOrderHistory = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const { orders, total, totalPages } = await getUserOrders(userId, page, limit);
  
  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    data: { 
      orders, 
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    },
  });
};

export const getCurrentSubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;
  
  const subscription = await getUserActiveSubscription(userId);
  const status = await getSubscriptionStatus(userId);
  
  res.status(200).json({
    success: true,
    message: "Subscription details fetched successfully",
    data: { 
      subscription: subscription?.order,
      plan: subscription?.plan,
      status,
    },
  });
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const { transactions, total, totalPages } = await getUserTransactions(userId, page, limit);
  
  res.status(200).json({
    success: true,
    message: "Transactions fetched successfully",
    data: { 
      transactions, 
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    },
  });
};

export const checkSubscriptionStatus = async (req: Request, res: Response) => {
  const userId = req.user.id;
  
  const status = await getSubscriptionStatus(userId);
  
  res.status(200).json({
    success: true,
    message: "Subscription status checked successfully",
    data: { status },
  });
};

export const getOrderDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const order = await getOrderById(id);
  
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  
  // Check if order belongs to user
  if (order.order.userId !== userId && req.user.role !== "admin") {
    throw new BadRequestError("Unauthorized to view this order");
  }
  
  res.status(200).json({
    success: true,
    message: "Order details fetched successfully",
    data: { order },
  });
};