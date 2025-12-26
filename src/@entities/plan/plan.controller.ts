// @entities/plan/plan.controller.ts - UPDATED VERSION
import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { PlanModel } from "./plan.model";
import { SubscriptionModel } from "../subscription/subscription.model";
import { UserModel } from "../user/user.model";
import sendEmail from "../../helpers/sendEmail";
import { getPriceChangeNotificationHTML } from "../../helpers/emailText";
import { createNotification } from "../notification/notification.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

// Create $10 monthly plan (ONE TIME)
export const createMonthlyPlan = async (req: Request, res: Response) => {
  try {
    console.log("📦 Creating $10 monthly plan...");

    // Check if exists
    const existing = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.name, "Monthly Plan"),
    });

    if (existing) {
      return res.json({
        success: true,
        message: "✅ Plan already exists",
        data: {
          plan: existing,
          env: `STRIPE_PRICE_ID=${existing.stripePriceId}`
        }
      });
    }

    // 1. Create Stripe Product
    const product = await stripe.products.create({
      name: "Monthly Caregiver Plan",
      description: "$10 per month subscription",
    });

    // 2. Create Stripe Price ($10/month)
    const price = await stripe.prices.create({
      unit_amount: 1000, // $10.00 in cents
      currency: "usd",
      recurring: { interval: "month" },
      product: product.id,
    });

    // 3. Save to database - Store as cents (1000)
    const [plan] = await db.insert(PlanModel).values({
      name: "Monthly Plan",
      description: "$10 per month",
      amount: 1000,
      interval: "month",
      stripeProductId: product.id,
      stripePriceId: price.id,
      isActive: true,
      isLatest: true, // NEW: Mark as latest price
    }).returning();

    res.status(201).json({
      success: true,
      message: "✅ Monthly $10 plan created!",
      data: {
        plan: {
          ...plan,
          displayAmount: "$10.00",
        },
        stripePriceId: price.id,
        nextStep: `Add to .env: STRIPE_PRICE_ID=${price.id}`
      }
    });

  } catch (error: any) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create plan",
      error: error.message
    });
  }
};

// Get active plans (always returns latest price)
export const getPlans = async (req: Request, res: Response) => {
  try {
    // Get only the latest active plan
    const plan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true),
        eq(PlanModel.isActive, true)
      ),
    });

    if (!plan) {
      return res.json({
        success: true,
        data: { plans: [] }
      });
    }

    // Format for display
    const formattedPlan = {
      ...plan,
      displayAmount: `$${(plan.amount / 100).toFixed(2)}`,
    };

    res.json({
      success: true,
      data: { plans: [formattedPlan] } // Return array for compatibility
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get plans",
      error: error.message
    });
  }
};

// NEW: Update plan price with proper handling
export const updatePlanPrice = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const { newAmount } = req.body; // in cents

  try {
    // Find the existing plan
    const existingPlan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.id, planId),
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    // Create new price in Stripe
    const newPrice = await stripe.prices.create({
      unit_amount: newAmount,
      currency: "usd",
      recurring: { interval: existingPlan.interval as Stripe.Price.Recurring.Interval },
      product: existingPlan.stripeProductId!,
    });

    // Mark old plan as not latest
    await db
      .update(PlanModel)
      .set({
        isLatest: false,
        updatedAt: new Date(),
      })
      .where(eq(PlanModel.id, planId));

    // Create new plan record with new price
    const [newPlan] = await db.insert(PlanModel).values({
      name: existingPlan.name,
      description: existingPlan.description,
      amount: newAmount,
      interval: existingPlan.interval,
      stripeProductId: existingPlan.stripeProductId,
      stripePriceId: newPrice.id,
      isActive: true,
      isLatest: true, // This is now the latest price
      previousPlanId: planId, // Track relationship
    }).returning();

    // Get all active subscriptions with the OLD price (planId)
    const activeSubscriptions = await db
      .select({
        subscription: SubscriptionModel,
        user: UserModel
      })
      .from(SubscriptionModel)
      .innerJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
      .where(
        and(
          eq(SubscriptionModel.planId, planId), // Old plan ID
          eq(SubscriptionModel.status, "active"),
          eq(SubscriptionModel.cancelAtPeriodEnd, false)
        )
      );

    // For each active subscription, cancel auto-renewal at period end
    const notificationPromises = activeSubscriptions.map(async ({ subscription, user }) => {
      try {
        // Cancel auto-renewal in Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        await db
          .update(SubscriptionModel)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(SubscriptionModel.id, subscription.id));

        // Send email notification
        await sendEmail({
          to: user.email,
          subject: "Important: Subscription Price Update",
          html: getPriceChangeNotificationHTML(
            user.name || "Valued Customer",
            existingPlan.amount,
            newAmount,
            subscription.currentPeriodEnd
          )
        });

        // Create in-app notification
        await createNotification(
          user.id,
          "Subscription Price Update",
          `Our subscription price has changed from $${(existingPlan.amount / 100).toFixed(2)} to $${(newAmount / 100).toFixed(2)}. Your current subscription will not auto-renew. Please review your options before it ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
          "system"
        );

        console.log(`✅ Notified user ${user.email} about price change`);

      } catch (error) {
        console.error(`Failed to notify user ${user.id}:`, error);
      }
    });

    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);

    // Archive the old price in Stripe (optional)
    // await stripe.prices.update(existingPlan.stripePriceId!, {
    //   active: false,
    // });

    res.json({
      success: true,
      message: `Price updated successfully from $${(existingPlan.amount / 100).toFixed(2)} to $${(newAmount / 100).toFixed(2)}. ${activeSubscriptions.length} existing customers have been notified and their subscriptions will not auto-renew.`,
      data: {
        oldPlan: {
          ...existingPlan,
          displayAmount: `$${(existingPlan.amount / 100).toFixed(2)}`,
        },
        newPlan: {
          ...newPlan,
          displayAmount: `$${(newPlan!.amount / 100).toFixed(2)}`,
        },
        affectedCustomers: activeSubscriptions.length
      }
    });

  } catch (error: any) {
    console.error("Error updating plan price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update plan price",
      error: error.message
    });
  }
};

// NEW: Get all price history
export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(PlanModel)
      .where(eq(PlanModel.name, "Monthly Plan"))
      .orderBy(PlanModel.createdAt);

    const formattedPlans = plans.map(plan => ({
      ...plan,
      displayAmount: `$${(plan.amount / 100).toFixed(2)}`,
      isCurrent: plan.isLatest,
      createdAt: plan.createdAt,
    }));

    res.json({
      success: true,
      data: { 
        priceHistory: formattedPlans,
        currentPrice: formattedPlans.find(p => p.isLatest)
      }
    });
  } catch (error: any) {
    console.error("Error getting price history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get price history",
      error: error.message
    });
  }
};