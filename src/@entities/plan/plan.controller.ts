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
      description: "Monthly plan subscription",
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
// COMPLETELY CORRECTED updatePlanPrice function
// CORRECTED: updatePlanPrice function - Notifies ALL active customers
export const updatePlanPrice = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const { newAmount } = req.body; // in cents

  try {
    console.log(`🔄 Updating price to $${(newAmount / 100).toFixed(2)}`);

    // Find the CURRENT latest plan
    const currentLatestPlan = await db.query.PlanModel.findFirst({
      where: and(
        eq(PlanModel.name, "Monthly Plan"),
        eq(PlanModel.isLatest, true)
      ),
    });

    if (!currentLatestPlan) {
      return res.status(404).json({
        success: false,
        message: "No current plan found"
      });
    }

    console.log(`📊 Current latest plan: $${(currentLatestPlan.amount / 100).toFixed(2)}`);

    // Create new price in Stripe
    const newPrice = await stripe.prices.create({
      unit_amount: newAmount,
      currency: "usd",
      recurring: { interval: currentLatestPlan.interval as Stripe.Price.Recurring.Interval },
      product: currentLatestPlan.stripeProductId!,
    });

    // Mark current latest as not latest
    await db
      .update(PlanModel)
      .set({
        isLatest: false,
        updatedAt: new Date(),
      })
      .where(eq(PlanModel.id, currentLatestPlan.id));

    // Create new plan record
    const [newPlan] = await db.insert(PlanModel).values({
      name: currentLatestPlan.name,
      description: currentLatestPlan.description,
      amount: newAmount,
      interval: currentLatestPlan.interval,
      stripeProductId: currentLatestPlan.stripeProductId,
      stripePriceId: newPrice.id,
      isActive: true,
      isLatest: true,
      previousPlanId: currentLatestPlan.id,
    }).returning();

    console.log(`✨ New plan created: $${(newPlan!.amount / 100).toFixed(2)}`);

    // FIX: Get ALL active subscriptions regardless of cancelAtPeriodEnd
    const allSubscriptions = await db
      .select({
        subscription: SubscriptionModel,
        user: UserModel,
        plan: PlanModel
      })
      .from(SubscriptionModel)
      .innerJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
      .innerJoin(PlanModel, eq(SubscriptionModel.planId, PlanModel.id))
      .where(
        and(
          eq(PlanModel.name, "Monthly Plan"),
          eq(SubscriptionModel.status, "active")
          // REMOVED: eq(SubscriptionModel.cancelAtPeriodEnd, false)
        )
      );

    console.log(`🔍 Found ${allSubscriptions.length} total active subscriptions (including those already marked to cancel)`);

    // Filter to get subscriptions on OLD prices (not the new plan)
    const oldPriceSubscriptions = allSubscriptions.filter(
      ({ plan }) => plan.id !== newPlan!.id
    );

    console.log(`📋 Found ${oldPriceSubscriptions.length} subscriptions on old prices`);

    // Group by price AND cancellation status for reporting
    const priceGroups: Record<string, number> = {};
    const cancellationStatusGroups = {
      willCancel: 0, // cancelAtPeriodEnd: false
      alreadyCancelling: 0 // cancelAtPeriodEnd: true
    };

    oldPriceSubscriptions.forEach(({ subscription, plan }) => {
      const priceKey = `$${(plan.amount / 100).toFixed(2)}`;
      priceGroups[priceKey] = (priceGroups[priceKey] || 0) + 1;
      
      // Track cancellation status
      if (subscription.cancelAtPeriodEnd) {
        cancellationStatusGroups.alreadyCancelling++;
      } else {
        cancellationStatusGroups.willCancel++;
      }
    });

    console.log('💰 Price groups:', priceGroups);
    console.log('📊 Cancellation status:', cancellationStatusGroups);

    // Process each subscription on old price
    const notificationPromises = oldPriceSubscriptions.map(async ({ subscription, user, plan }) => {
      try {
        console.log(`🔄 Processing ${user.email} on $${(plan.amount / 100).toFixed(2)} plan (cancelAtPeriodEnd: ${subscription.cancelAtPeriodEnd})`);

        // ONLY cancel auto-renewal if it's not already cancelled
        if (!subscription.cancelAtPeriodEnd) {
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
        } else {
          console.log(`ℹ️ ${user.email} already marked for cancellation, skipping Stripe update`);
        }

        // Send email notification to ALL users
        await sendEmail({
          to: user.email,
          subject: "Important: Subscription Price Update",
          html: getPriceChangeNotificationHTML(
            user.name || "Valued Customer",
            plan.amount,
            newAmount,
            subscription.currentPeriodEnd,
            subscription.cancelAtPeriodEnd // Pass cancellation status for personalized message
          )
        });

        // Create in-app notification for ALL users
        await createNotification(
          user.id,
          "Subscription Price Update",
          subscription.cancelAtPeriodEnd 
            ? `Our subscription price has changed from $${(plan.amount / 100).toFixed(2)} to $${(newAmount / 100).toFixed(2)}. Your current subscription is already set to not auto-renew. Please review your options before it ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
            : `Our subscription price has changed from $${(plan.amount / 100).toFixed(2)} to $${(newAmount / 100).toFixed(2)}. Your current subscription will not auto-renew. Please review your options before it ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
          "system"
        );

        console.log(`✅ Notified ${user.email} ($${(plan.amount / 100).toFixed(2)} → $${(newAmount / 100).toFixed(2)})`);

      } catch (error) {
        console.error(`❌ Failed to notify ${user.email}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: `Price updated to $${(newAmount / 100).toFixed(2)}. ${oldPriceSubscriptions.length} customers on previous prices have been notified.`,
      data: {
        oldPlan: {
          ...currentLatestPlan,
          displayAmount: `$${(currentLatestPlan.amount / 100).toFixed(2)}`,
        },
        newPlan: {
          ...newPlan,
          displayAmount: `$${(newPlan!.amount / 100).toFixed(2)}`,
        },
        totalCustomersNotified: oldPriceSubscriptions.length,
        priceGroups: priceGroups,
        cancellationStatus: cancellationStatusGroups,
        summary: {
          willStopAutoRenew: cancellationStatusGroups.willCancel,
          alreadyStoppingRenewal: cancellationStatusGroups.alreadyCancelling,
          affectedPriceTiers: Object.entries(priceGroups).map(([price, count]) => ({
            price,
            customerCount: count
          }))
        }
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