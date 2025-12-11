import Stripe from "stripe";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { PlanModel } from "../@entities/plan/plan.model";
import { SubscriptionModel } from "../@entities/subscription/subscription.model";

// Validate Stripe key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

const frontendDomain = process.env.FRONTEND_URL || "http://localhost:3000";

// Get or create Stripe customer
const getOrCreateCustomer = async (userId: string, email: string) => {
  const customers = await stripe.customers.list({ email, limit: 1 });
  
  if (customers.data.length > 0) {
    return customers.data[0].id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
};

// Create subscription checkout
export const createSubscriptionCheckout = async (userId: string) => {
  // Get user email
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { email: true }
  });

  if (!user?.email) throw new Error("User email not found");

  // Get monthly plan
  const plan = await db.query.PlanModel.findFirst({
    where: eq(PlanModel.name, "Monthly Plan"),
  });

  if (!plan?.stripePriceId) throw new Error("Monthly plan not configured");

  // Get/create customer
  const customerId = await getOrCreateCustomer(userId, user.email);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { userId, planId: plan.id },
    subscription_data: { metadata: { userId, planId: plan.id } },
    success_url: `${frontendDomain}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendDomain}/subscription?cancelled=true`,
  });

  return session.url;
};

// Get subscription status
export const getSubscriptionStatus = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { hasActiveSubscription: true }
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

// Cancel subscription on Stripe
export const cancelStripeSubscription = async (stripeSubscriptionId: string) => {
  try {
    const subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    return subscription;
  } catch (error: any) {
    console.error("Error cancelling Stripe subscription:", error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
};

// WEBHOOK HANDLER - IMPORTANT: Use raw body
export const stripeWebhookHandler = async (req: Request, res: Response) => {
  console.log("🔔 Stripe webhook received");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    console.error("❌ No signature");
    return res.status(400).json({ error: "No signature" });
  }

  let event: Stripe.Event;

  try {
    // IMPORTANT: Use raw body, not parsed JSON
    const rawBody = req.body;
    
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`✅ Webhook: ${event.type}`);

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
        console.log(`ℹ️ Skipping: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// NEW: Handle checkout session completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`🛒 Checkout completed: ${session.id}`);
  
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  
  if (!userId || !planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const subscriptionId = session.subscription as string;
  
  if (!subscriptionId) {
    console.error("No subscription ID in checkout session");
    return;
  }

  // Retrieve subscription from Stripe to get full details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await handleSubscriptionCreated(subscription);
}

// WEBHOOK HANDLERS
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`🔄 Subscription created: ${subscription.id}`);
  
  let userId = subscription.metadata?.userId;
  let planId = subscription.metadata?.planId;
  
  // If metadata is missing, try to get from price
  if (!planId && subscription.items.data[0]?.price.id) {
    const priceId = subscription.items.data[0].price.id;
    const plan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.stripePriceId, priceId),
    });
    if (plan) {
      planId = plan.id;
    }
  }
  
  if (!userId || !planId) {
    console.error("Missing userId or planId in subscription metadata");
    return;
  }

  // Check if subscription already exists
  const existing = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.stripeSubscriptionId, subscription.id),
  });

  if (existing) {
    console.log(`Subscription ${subscription.id} already exists in database`);
    return;
  }

  // TYPE ASSERTION FIX: Access snake_case properties
  const currentPeriodEnd = (subscription as any).current_period_end;
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;

  // Create subscription record
  await db.insert(SubscriptionModel).values({
    userId,
    planId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    status: subscription.status,
    cancelAtPeriodEnd: cancelAtPeriodEnd || false,
  });

  // Update user - only active if status is "active" (no trial)
  const isActive = subscription.status === "active";
  await db
    .update(UserModel)
    .set({ hasActiveSubscription: isActive })
    .where(eq(UserModel.id, userId));

  console.log(`✅ Subscription saved for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`📝 Subscription updated: ${subscription.id}`);
  
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // TYPE ASSERTION FIX: Access snake_case properties
  const currentPeriodEnd = (subscription as any).current_period_end;
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;

  // Update subscription
  await db
    .update(SubscriptionModel)
    .set({
      status: subscription.status,
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: cancelAtPeriodEnd || false,
      updatedAt: new Date(),
    })
    .where(eq(SubscriptionModel.stripeSubscriptionId, subscription.id));

  // Update user - only active if status is "active" (no trial)
  const isActive = subscription.status === "active";
  await db
    .update(UserModel)
    .set({
      hasActiveSubscription: isActive,
    })
    .where(eq(UserModel.id, userId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`❌ Subscription deleted: ${subscription.id}`);
  
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // Update subscription
  await db
    .update(SubscriptionModel)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(SubscriptionModel.stripeSubscriptionId, subscription.id));

  // Update user
  await db
    .update(UserModel)
    .set({ hasActiveSubscription: false })
    .where(eq(UserModel.id, userId));
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log(`💰 Monthly payment succeeded: ${invoice.id}`);
  
  // TYPE ASSERTION FIX: Access subscription property
  const subscriptionRef = (invoice as any).subscription;
  
  if (!subscriptionRef) return;

  const subscriptionId = typeof subscriptionRef === 'string' 
    ? subscriptionRef 
    : (subscriptionRef as any).id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // TYPE ASSERTION FIX: Access snake_case property
  const currentPeriodEnd = (subscription as any).current_period_end;

  // Update subscription date
  await db
    .update(SubscriptionModel)
    .set({
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      updatedAt: new Date(),
    })
    .where(eq(SubscriptionModel.stripeSubscriptionId, subscription.id));

  // Update user to active after successful payment
  if (subscription.metadata?.userId) {
    await db
      .update(UserModel)
      .set({ 
        hasActiveSubscription: true,
        updatedAt: new Date(),
      })
      .where(eq(UserModel.id, subscription.metadata.userId));
  }

  console.log(`✅ Updated period for ${subscription.id}`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  console.log(`❌ Monthly payment failed: ${invoice.id}`);
  
  // TYPE ASSERTION FIX: Access subscription property
  const subscriptionRef = (invoice as any).subscription;
  
  if (!subscriptionRef) return;

  const subscriptionId = typeof subscriptionRef === 'string' 
    ? subscriptionRef 
    : (subscriptionRef as any).id;

  if (!subscriptionId) return;

  // Update subscription status to past_due
  await db
    .update(SubscriptionModel)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(SubscriptionModel.stripeSubscriptionId, subscriptionId));

  // Update user to inactive when payment fails
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata?.userId) {
      await db
        .update(UserModel)
        .set({ 
          hasActiveSubscription: false,
          updatedAt: new Date(),
        })
        .where(eq(UserModel.id, subscription.metadata.userId));
    }
  } catch (error) {
    console.error("Error retrieving subscription:", error);
  }

  console.log(`❌ Marked subscription ${subscriptionId} as past_due`);
}