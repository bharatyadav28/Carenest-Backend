import { Request, Response } from "express";
import { eq,and } from "drizzle-orm";
import { db } from "../../db";
import { PlanModel } from "../plan/plan.model";
import { UserModel } from "../user/user.model";
import { SubscriptionModel } from "./subscription.model";
import { BadRequestError } from "../../errors";
import { 
  createSubscriptionCheckout, 
  getSubscriptionStatus, 
  scheduleSubscriptionCancellation,
  reactivateStripeSubscription 
} from "../../helpers/stripe";

// 1. CREATE SUBSCRIPTION CHECKOUT - FIXED to allow resubscription
export const createSubscriptionCheckoutController = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // Check if user has an ACTIVE subscription (not cancelled or past_due)
    const existingSubscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    // Only block if user has an ACTIVE subscription
    if (existingSubscription?.status === "active") {
      throw new BadRequestError("You already have an active subscription");
    }

    // If user has a CANCELED or PAST_DUE subscription, allow checkout
    // The webhook will UPDATE the existing record

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
    // Get subscription (without relations)
    const subscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    // Get plan separately if subscription exists
    let plan = null;
    let currentPlan = null;
    
    if (subscription?.planId) {
      plan = await db.query.PlanModel.findFirst({
        where: eq(PlanModel.id, subscription.planId),
      });
    }

    // Get current (latest) plan
    currentPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    // Get user subscription status
    const user = await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: { hasActiveSubscription: true }
    });

    // Check if user is on old price
    const isOnOldPrice = plan?.id !== currentPlan?.id && plan?.amount !== currentPlan?.amount;
    const priceDifference = currentPlan && plan ? currentPlan.amount - plan.amount : 0;

    // Format response
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
        canRenewAtCurrentPrice: isOnOldPrice && subscription.status === "active"
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

// 3. CANCEL SUBSCRIPTION - Cancel at period end
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

    // ✅ Schedule cancellation at period end (NOT immediate)
    await scheduleSubscriptionCancellation(subscription.stripeSubscriptionId);

    // Update database - mark for cancellation at period end
    await db
      .update(SubscriptionModel)
      .set({
        cancelAtPeriodEnd: true, // ✅ This is TRUE - will cancel at period end
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, subscription.id));

    // ✅ DO NOT update user.hasActiveSubscription now!
    // User keeps access until currentPeriodEnd

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
        status: "active", // Still active until period ends
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

// 4. REACTIVATE SUBSCRIPTION - NEW ENDPOINT
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

    // Check if subscription is scheduled for cancellation
    if (!subscription.cancelAtPeriodEnd || subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not scheduled for cancellation"
      });
    }

    // Reactivate on Stripe
    await reactivateStripeSubscription(subscription.stripeSubscriptionId);

    // Update database
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

    // Format amount for display
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
// Add to subscription.controller.ts - NEW endpoint for renewal
export const renewSubscription = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // Check if user has a subscription scheduled for cancellation
    const existingSubscription = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });

    if (!existingSubscription) {
      throw new BadRequestError("No subscription found");
    }

    // Check if subscription is active but not auto-renewing
    if (existingSubscription.status !== "active" || !existingSubscription.cancelAtPeriodEnd) {
      throw new BadRequestError("Subscription is not scheduled for cancellation");
    }

    // Create checkout for renewal with current price
    const checkoutUrl = await createSubscriptionCheckout(userId);

    res.json({
      success: true,
      message: "Renewal checkout created",
      data: { checkoutUrl }
    });
  } catch (error: any) {
    console.error("Error creating renewal checkout:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create renewal checkout",
    });
  }
};


