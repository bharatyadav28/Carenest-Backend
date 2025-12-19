import Stripe from "stripe";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { PlanModel } from "../@entities/plan/plan.model";
import { SubscriptionModel } from "../@entities/subscription/subscription.model";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY missing");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

const frontendDomain = "https://carenest-caregiver.vercel.app";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const safeUnixToDate = (value: any): Date | null => {
  if (!value || typeof value !== "number") return null;
  return new Date(value * 1000);
};

const getOrCreateCustomer = async (userId: string, email: string) => {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length) return customers.data[0].id;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
};

// --------------------------------------------------
// CHECKOUT SESSION CREATION
// --------------------------------------------------

export const createSubscriptionCheckout = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { email: true },
  });

  if (!user?.email) throw new Error("User email not found");

  const plan = await db.query.PlanModel.findFirst({
    where: eq(PlanModel.name, "Monthly Plan"),
  });

  if (!plan?.stripePriceId) throw new Error("Monthly plan not configured");

  const customerId = await getOrCreateCustomer(userId, user.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { userId, planId: plan.id },
    subscription_data: { metadata: { userId, planId: plan.id } },
    success_url: `${frontendDomain}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendDomain}/subscription?cancelled=true`,
  });

  return session.url;
};

// --------------------------------------------------
// SUBSCRIPTION STATUS
// --------------------------------------------------

export const getSubscriptionStatus = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { hasActiveSubscription: true },
  });

  const subscription = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.userId, userId),
  });

  return {
    hasSubscription: user?.hasActiveSubscription || false,
    status: subscription?.status || "none",
    currentPeriodEnd: subscription?.currentPeriodEnd,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
  };
};

// --------------------------------------------------
// CANCEL/REACTIVATE FUNCTIONS
// --------------------------------------------------

// Schedule cancellation at period end (Recommended flow)
export const scheduleSubscriptionCancellation = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true, // ✅ Cancel at period end, not immediately
    });
  } catch (error: any) {
    throw new Error(`Failed to schedule subscription cancellation: ${error.message}`);
  }
};

// Reactivate subscription (remove cancellation flag)
export const reactivateStripeSubscription = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false, // ✅ Remove cancellation flag
    });
  } catch (error: any) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
};

// Immediate cancellation (Optional - not recommended)
export const cancelStripeSubscription = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.cancel(stripeSubscriptionId);
  } catch (error: any) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
};

// --------------------------------------------------
// WEBHOOK HANDLER (UPDATED)
// --------------------------------------------------

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(500).send("Webhook secret missing");
  if (!sig) return res.status(400).send("Missing signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
    console.log("Webhook:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log("Ignored:", event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// --------------------------------------------------
// HANDLERS
// --------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId) {
    console.error("Missing userId or planId in session metadata");
    return;
  }

  if (!session.subscription) {
    console.error("No subscription in checkout session");
    return;
  }

  // Retrieve the subscription to ensure metadata is passed
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // Ensure metadata is set on the subscription
  if (!subscription.metadata?.userId) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        userId: userId,
        planId: planId,
        ...subscription.metadata // Keep existing metadata
      }
    });
  }
  
  await handleSubscriptionCreated(subscription);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId;
  let planId = subscription.metadata?.planId;

  if (!planId && subscription.items.data[0]?.price.id) {
    const priceId = subscription.items.data[0].price.id;
    const plan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.stripePriceId, priceId),
    });
    if (plan) planId = plan.id;
  }

  if (!userId || !planId) return;

  const periodEndTimestamp =
    (subscription as any).current_period_end || subscription.items.data[0]?.current_period_end;
  const periodEnd = safeUnixToDate(periodEndTimestamp);
  if (!periodEnd) return;

  // Check if user already has ANY subscription (active or canceled)
  const existingSubscription = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.userId, userId),
  });

  if (existingSubscription) {
    // UPDATE existing subscription instead of creating new one
    await db
      .update(SubscriptionModel)
      .set({
        stripeSubscriptionId: subscription.id,
        planId: planId,
        currentPeriodEnd: periodEnd,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.userId, userId));
    
    console.log(`Updated existing subscription for user ${userId} with new Stripe ID: ${subscription.id}`);
  } else {
    // Create new subscription only if none exists
    await db.insert(SubscriptionModel).values({
      userId,
      planId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: periodEnd,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    });
    
    console.log(`Created new subscription for user ${userId} with Stripe ID: ${subscription.id}`);
  }

  // Always update user's subscription status
  await db
    .update(UserModel)
    .set({ 
      hasActiveSubscription: subscription.status === "active" 
    })
    .where(eq(UserModel.id, userId));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  
  const periodEndTimestamp =
    (subscription as any).current_period_end || subscription.items.data[0]?.current_period_end;
  const periodEnd = safeUnixToDate(periodEndTimestamp);
  if (!periodEnd) return;

  // First, try to find subscription by stripeSubscriptionId
  let existingSub = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.stripeSubscriptionId, subscription.id),
  });

  // If not found by stripeSubscriptionId, find by userId
  if (!existingSub) {
    existingSub = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });
  }

  if (existingSub) {
    // Update the existing subscription
    await db
      .update(SubscriptionModel)
      .set({
        stripeSubscriptionId: subscription.id, // Update stripe ID if it changed
        status: subscription.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, existingSub.id));
  } else {
    // Create new subscription if none exists (should rarely happen)
    const planId = subscription.metadata?.planId;
    if (planId) {
      await db.insert(SubscriptionModel).values({
        userId,
        planId,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: periodEnd,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      });
    }
  }

  // Update user access based on subscription status
  if (subscription.status === "active") {
    // User has active subscription (even if cancel_at_period_end is true)
    await db
      .update(UserModel)
      .set({ hasActiveSubscription: true })
      .where(eq(UserModel.id, userId));
  } else if (subscription.status === "canceled") {
    // Subscription is fully canceled
    await db
      .update(UserModel)
      .set({ hasActiveSubscription: false })
      .where(eq(UserModel.id, userId));
  } else if (subscription.status === "past_due") {
    // Past due - restrict access
    await db
      .update(UserModel)
      .set({ hasActiveSubscription: false })
      .where(eq(UserModel.id, userId));
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Find subscription by stripe ID or user ID
  let existingSub = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.stripeSubscriptionId, subscription.id),
  });

  if (!existingSub) {
    existingSub = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });
  }

  if (existingSub) {
    await db
      .update(SubscriptionModel)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, existingSub.id));
  }

  await db
    .update(UserModel)
    .set({ hasActiveSubscription: false })
    .where(eq(UserModel.id, userId));
}

// --------------------------------------------------
// FIXED for Stripe 2025 API
// --------------------------------------------------

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const line = invoice.lines.data[0];
  if (!line) {
    console.log("❌ Invoice has no line items");
    return;
  }
  const subscriptionId =
    (line as any)?.parent?.subscription_item_details?.subscription;

  if (!subscriptionId) {
    console.log("❌ No subscriptionId found in invoice");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const periodEnd = safeUnixToDate(line.period?.end);
  if (!periodEnd) {
    console.log("❌ No period end found in invoice line item");
    return;
  }

  // Find subscription by stripe ID or user ID
  let existingSub = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.stripeSubscriptionId, subscriptionId),
  });

  if (!existingSub) {
    existingSub = await db.query.SubscriptionModel.findFirst({
      where: eq(SubscriptionModel.userId, userId),
    });
  }

  if (existingSub) {
    await db
      .update(SubscriptionModel)
      .set({
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: periodEnd,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, existingSub.id));
  } else {
    // Create new if doesn't exist
    const planId = subscription.metadata?.planId;
    if (planId) {
      await db.insert(SubscriptionModel).values({
        userId,
        planId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: periodEnd,
        status: "active",
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      });
    }
  }

  await db
    .update(UserModel)
    .set({ hasActiveSubscription: true })
    .where(eq(UserModel.id, userId));

  console.log("✅ Invoice paid updated:", subscriptionId);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const line = invoice.lines.data[0];
  const subscriptionId =
    (line as any)?.parent?.subscription_item_details?.subscription;

  if (!subscriptionId) {
    console.log("❌ No subscriptionId in failed invoice");
    return;
  }

  // Find subscription by stripe ID
  let existingSub = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.stripeSubscriptionId, subscriptionId),
  });

  if (existingSub) {
    await db
      .update(SubscriptionModel)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionModel.id, existingSub.id));
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await db
    .update(UserModel)
    .set({ hasActiveSubscription: false })
    .where(eq(UserModel.id, userId));

  console.log("❌ Invoice failed updated:", subscriptionId);
}