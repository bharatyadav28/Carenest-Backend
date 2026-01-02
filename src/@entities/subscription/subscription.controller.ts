// @entities/subscription/subscription.controller.ts - UPDATED
import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { PlanModel } from "../plan/plan.model";
import { UserModel } from "../user/user.model";
import { SubscriptionModel } from "./subscription.model";
import { BadRequestError } from "../../errors";
import { 
  createSubscriptionCheckout, 
  getSubscriptionStatus, 
  scheduleSubscriptionCancellation,
  reactivateStripeSubscription,
  updateSubscriptionPrice
} from "../../helpers/stripe";

// 1. CREATE SUBSCRIPTION CHECKOUT
export const createSubscriptionCheckoutController = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const existingSubscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (existingSubscription?.status === "active") {
      throw new BadRequestError("You already have an active subscription");
    }

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

// 2. GET MY SUBSCRIPTION - UPDATED
export const getMySubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    let plan = null;
    let currentPlan = null;
    
    if (subscription?.planId) {
      plan = await db.query.PlanModel.findFirst({
        where: eq(PlanModel.id, subscription.planId),
      });
    }

    currentPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    const user = await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: { hasActiveSubscription: true }
    });

    // FIXED: Check only by plan ID, not amount
    const isOnOldPrice = plan?.id !== currentPlan?.id;
    const priceDifference = currentPlan && plan ? currentPlan.amount - plan.amount : 0;

    const subscriptionData = subscription ? {
      ...subscription,
      plan: plan ? {
        ...plan,
        displayAmount: `$${(plan.amount / 100).toFixed(2)}`,
        isCurrentPrice: plan.id === currentPlan?.id,
      } : null,
      pricingInfo: {
        isOnOldPrice,
        currentPrice: currentPlan ? `$${(currentPlan.amount / 100).toFixed(2)}` : null,
        priceDifference: priceDifference !== 0 ? {
          amount: Math.abs(priceDifference / 100),
          formatted: `$${Math.abs(priceDifference / 100).toFixed(2)}`,
          isIncrease: priceDifference > 0,
          percentage: currentPlan && plan ? 
            Math.round((Math.abs(priceDifference) / plan.amount) * 100) : 0
        } : null,
        needsRenewal: isOnOldPrice && subscription.cancelAtPeriodEnd,
        canRenewAtCurrentPrice: isOnOldPrice && subscription.status === "active",
        requiresPriceUpdate: isOnOldPrice && subscription.cancelAtPeriodEnd
      }
    } : null;

    res.json({
      success: true,
      data: {
        subscription: subscriptionData,
        hasActiveSubscription: user?.hasActiveSubscription || false,
        currentPlan: currentPlan ? {
          ...currentPlan,
          displayAmount: `$${(currentPlan.amount / 100).toFixed(2)}`,
        } : null
      }
    });
  } catch (error: any) {
    console.error("Error getting subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subscription",
      error: error.message
    });
  }
};

// 3. CANCEL SUBSCRIPTION
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

    if (subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not active"
      });
    }

    await scheduleSubscriptionCancellation(subscription.stripeSubscriptionId);

    await db
      .update(SubscriptionModel)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, subscription.id));

    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const formattedDate = currentPeriodEnd.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    res.json({
      success: true,
      message: `Subscription scheduled for cancellation on ${formattedDate}. You'll keep full access until then.`,
      data: {
        accessUntil: subscription.currentPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: true,
        status: "active",
      }
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

// 4. REACTIVATE SUBSCRIPTION - UPDATED
export const reactivateSubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "No subscription found"
      });
    }

    const currentPlan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.id, subscription.planId),
    });

    const latestPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    // Check if user is trying to reactivate an old price
    if (currentPlan?.id !== latestPlan?.id && subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        message: `Price has changed from $${(currentPlan!.amount / 100).toFixed(2)} to $${(latestPlan!.amount / 100).toFixed(2)}. Please use the "Accept New Price" option to continue.`,
        data: {
          requiresPriceUpdate: true,
          oldPrice: `$${(currentPlan!.amount / 100).toFixed(2)}`,
          newPrice: `$${(latestPlan!.amount / 100).toFixed(2)}`
        }
      });
    }

    if (!subscription.cancelAtPeriodEnd || subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not scheduled for cancellation"
      });
    }

    await reactivateStripeSubscription(subscription.stripeSubscriptionId);

    await db
      .update(SubscriptionModel)
      .set({
        cancelAtPeriodEnd: false,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, subscription.id));

    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const formattedDate = currentPeriodEnd.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    res.json({
      success: true,
      message: `Subscription reactivated! It will now renew on ${formattedDate}`,
      data: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: subscription.currentPeriodEnd,
      }
    });
  } catch (error: any) {
    console.error("Error reactivating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate subscription",
      error: error.message
    });
  }
};

// 5. CHECK SUBSCRIPTION STATUS
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

// 6. GET ALL SUBSCRIPTIONS (Admin)
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await db
      .select({
        id: SubscriptionModel.id,
        userId: SubscriptionModel.userId,
        planId: SubscriptionModel.planId,
        stripeSubscriptionId: SubscriptionModel.stripeSubscriptionId,
        status: SubscriptionModel.status,
        currentPeriodEnd: SubscriptionModel.currentPeriodEnd,
        cancelAtPeriodEnd: SubscriptionModel.cancelAtPeriodEnd,
        createdAt: SubscriptionModel.createdAt,
        updatedAt: SubscriptionModel.updatedAt,
        user: {
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
        },
        plan: {
          id: PlanModel.id,
          name: PlanModel.name,
          amount: PlanModel.amount,
          interval: PlanModel.interval,
        },
      })
      .from(SubscriptionModel)
      .leftJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
      .leftJoin(PlanModel, eq(SubscriptionModel.planId, PlanModel.id))
      .orderBy(SubscriptionModel.createdAt);

    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      user: sub.user,
      plan: sub.plan ? {
        ...sub.plan,
        displayAmount: `$${(sub.plan.amount / 100).toFixed(2)}`,
      } : null,
    }));

    res.json({
      success: true,
      data: { subscriptions: formattedSubscriptions }
    });
  } catch (error: any) {
    console.error("Error getting all subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subscriptions",
      error: error.message
    });
  }
};

// 7. RENEW SUBSCRIPTION - UPDATED (NO IMMEDIATE PAYMENT)
export const renewSubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const existingSubscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (!existingSubscription) {
      throw new BadRequestError("No subscription found");
    }

    if (existingSubscription.status !== "active" || !existingSubscription.cancelAtPeriodEnd) {
      throw new BadRequestError("Subscription is not scheduled for cancellation");
    }

    const currentPlan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.id, existingSubscription.planId),
    });

    const latestPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    if (!currentPlan || !latestPlan) {
      throw new BadRequestError("Plan information not available");
    }

    const isOnOldPrice = currentPlan.id !== latestPlan.id;
    
    if (!isOnOldPrice) {
      throw new BadRequestError("You are already on the current price");
    }

    // Update subscription to new price (no immediate payment)
    await updateSubscriptionPrice(
      existingSubscription.stripeSubscriptionId,
      latestPlan.stripePriceId!
    );

    // Update database
    await db
      .update(SubscriptionModel)
      .set({
        cancelAtPeriodEnd: false,
        planId: latestPlan.id,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, existingSubscription.id));

    const currentPeriodEnd = new Date(existingSubscription.currentPeriodEnd);
    const formattedDate = currentPeriodEnd.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    res.json({
      success: true,
      message: `Subscription updated to new price! You'll be charged $${(latestPlan.amount / 100).toFixed(2)} starting from ${formattedDate}.`,
      data: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: existingSubscription.currentPeriodEnd,
        oldPrice: `$${(currentPlan.amount / 100).toFixed(2)}`,
        newPrice: `$${(latestPlan.amount / 100).toFixed(2)}`
      }
    });
  } catch (error: any) {
    console.error("Error updating subscription price:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update subscription price",
    });
  }
};

// 8. REACTIVATE WITH PRICE UPDATE - HELPER ENDPOINT
export const reactivateSubscriptionWithPriceUpdate = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "No subscription found"
      });
    }

    const currentPlan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.id, subscription.planId),
    });

    const latestPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    if (!currentPlan || !latestPlan) {
      return res.status(400).json({
        success: false,
        message: "Plan information not available"
      });
    }

    const isOnOldPrice = currentPlan.id !== latestPlan.id;

    if (isOnOldPrice && subscription.cancelAtPeriodEnd) {
      return res.json({
        success: false,
        message: "Price has changed. Please use the 'Accept New Price' option.",
        data: {
          requiresPriceUpdate: true,
          oldPrice: `$${(currentPlan.amount / 100).toFixed(2)}`,
          newPrice: `$${(latestPlan.amount / 100).toFixed(2)}`,
          priceDifference: `$${Math.abs((latestPlan.amount - currentPlan.amount) / 100).toFixed(2)}`,
          isPriceIncrease: latestPlan.amount > currentPlan.amount
        }
      });
    }

    if (!subscription.cancelAtPeriodEnd || subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not scheduled for cancellation"
      });
    }

    await reactivateStripeSubscription(subscription.stripeSubscriptionId);

    await db
      .update(SubscriptionModel)
      .set({
        cancelAtPeriodEnd: false,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, subscription.id));

    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const formattedDate = currentPeriodEnd.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    res.json({
      success: true,
      message: `Subscription reactivated! It will now renew on ${formattedDate}`,
      data: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: subscription.currentPeriodEnd,
        requiresPriceUpdate: false
      }
    });
  } catch (error: any) {
    console.error("Error reactivating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate subscription",
      error: error.message
    });
  }
};