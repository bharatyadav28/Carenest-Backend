import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { PlanModel } from "./plan.model";

// Add API version
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
      amount: 1000, // FIXED: Store in cents
      interval: "month",
      stripeProductId: product.id,
      stripePriceId: price.id,
      isActive: true,
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

// Get active plans
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(PlanModel)
      .where(eq(PlanModel.isActive, true));

    // Format for display
    const formattedPlans = plans.map(plan => ({
      ...plan,
      displayAmount: `$${(plan.amount / 100).toFixed(2)}`,
    }));

    res.json({
      success: true,
      data: { plans: formattedPlans }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get plans",
      error: error.message
    });
  }
};