import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { PlanModel } from "../plan/plan.model";
import { UserModel } from "../user/user.model";
import { SubscriptionModel } from "./subscription.model";
import { BadRequestError } from "../../errors";
import { createSubscriptionCheckout, getSubscriptionStatus } from "../../helpers/stripe";
import { cancelStripeSubscription } from "../../helpers/stripe";

// 1. CREATE SUBSCRIPTION CHECKOUT
export const createSubscriptionCheckoutController = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // Check if already has active subscription
    const existing = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (existing?.status === "active") {
      throw new BadRequestError("You already have an active subscription");
    }

    // Create checkout
    const checkoutUrl = await createSubscriptionCheckout(userId);

    res.json({
      success: true,
      message: "Subscription checkout created",
      data: { checkoutUrl }
    });
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create checkout",
    });
  }
};

// 2. GET MY SUBSCRIPTION
export const getMySubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
      with: {
        plan: true,
        user: true,
      },
    });

    const user = await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: { hasActiveSubscription: true }
    });

    res.json({
      success: true,
      data: {
        subscription,
        hasActiveSubscription: user?.hasActiveSubscription || false,
      }
    });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subscription",
      error: error.message
    });
  }
};

// 3. CANCEL SUBSCRIPTION - Immediate cancellation
export const cancelSubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "No active subscription found"
      });
    }

    // Cancel immediately on Stripe
    await cancelStripeSubscription(subscription.stripeSubscriptionId);

    // Update database - immediate cancellation
    await db
      .update(SubscriptionModel)
      .set({
        status: "canceled",
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, subscription.id));

    // Update user immediately
    await db
      .update(UserModel)
      .set({ 
        hasActiveSubscription: false,
        updatedAt: new Date(),
      })
      .where(eq(UserModel.id, userId));

    res.json({
      success: true,
      message: "Subscription cancelled immediately"
    });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: error.message
    });
  }
};

// 4. CHECK SUBSCRIPTION STATUS
export const checkSubscriptionStatus = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const status = await getSubscriptionStatus(userId);
    
    res.json({
      success: true,
      data: { status }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to check status",
      error: error.message
    });
  }
};

// 5. GET ALL SUBSCRIPTIONS (Admin)
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await db
      .select({
        subscription: SubscriptionModel,
        user: {
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
        },
        plan: {
          name: PlanModel.name,
          amount: PlanModel.amount,
        },
      })
      .from(SubscriptionModel)
      .innerJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
      .innerJoin(PlanModel, eq(SubscriptionModel.planId, PlanModel.id));

    // Format amount for display
    const formattedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      plan: {
        ...sub.plan,
        displayAmount: `$${(sub.plan.amount / 100).toFixed(2)}`,
      }
    }));

    res.json({
      success: true,
      data: { subscriptions: formattedSubscriptions }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get subscriptions",
      error: error.message
    });
  }
};