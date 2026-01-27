import Stripe from "stripe";
import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { UserModel } from "../@entities/user/user.model";
import { PlanModel } from "../@entities/plan/plan.model";
import { SubscriptionModel } from "../@entities/subscription/subscription.model";
import sendEmail from "../helpers/sendEmail";
import { getPriceChangeNotificationHTML, getOldPriceSubscriptionHTML } from "../helpers/emailText";
import { createNotification } from "../@entities/notification/notification.service";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY missing");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

const frontendDomain = process.env.FRONTEND_URL || "https://carenest-caregiver.vercel.app";


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



export const updateSubscriptionPrice = async (subscriptionId: string, newPriceId: string) => {
  try {
    // First retrieve the subscription to get the item ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update the subscription to use new price from next billing cycle
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        cancel_at_period_end: false, // Remove cancellation flag
        proration_behavior: 'none', // No immediate charge
      }
    );
    
    return updatedSubscription;
  } catch (error: any) {
    throw new Error(`Failed to update subscription price: ${error.message}`);
  }
};

export const createSubscriptionCheckout = async (userId: string, isRenewal: boolean = false) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { email: true },
  });

  if (!user?.email) throw new Error("User email not found");

  const plan = await db.query.PlanModel.findFirst({
    where: and(
      eq(PlanModel.name, "Monthly Plan"),
      eq(PlanModel.isLatest, true),
      eq(PlanModel.isActive, true)
    ),
  });

  if (!plan?.stripePriceId) throw new Error("Monthly plan not configured");

  const customerId = await getOrCreateCustomer(userId, user.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { 
      userId, 
      planId: plan.id,
      isRenewal: isRenewal.toString() 
    },
    subscription_data: { 
      metadata: { userId, planId: plan.id },
    },
    success_url: `${frontendDomain}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendDomain}/subscription?cancelled=true`,
  });

  console.log(`🎯 Checkout created for user ${user.email} at price: $${(plan.amount / 100).toFixed(2)}`);

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


// Schedule cancellation at period end
export const scheduleSubscriptionCancellation = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error: any) {
    throw new Error(`Failed to schedule subscription cancellation: ${error.message}`);
  }
};

// Reactivate subscription (remove cancellation flag)
export const reactivateStripeSubscription = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (error: any) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
};

// Immediate cancellation
export const cancelStripeSubscription = async (stripeSubscriptionId: string) => {
  try {
    return await stripe.subscriptions.cancel(stripeSubscriptionId);
  } catch (error: any) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
};



export const updatePlanPriceForAllUsers = async (oldPlanId: string, newPlanId: string, newAmount: number) => {
  try {
    // Get all active subscriptions with the OLD price
    const activeSubscriptions = await db
      .select({
        subscription: SubscriptionModel,
        user: UserModel
      })
      .from(SubscriptionModel)
      .innerJoin(UserModel, eq(SubscriptionModel.userId, UserModel.id))
      .where(
        and(
          eq(SubscriptionModel.planId, oldPlanId),
          eq(SubscriptionModel.status, "active"),
          eq(SubscriptionModel.cancelAtPeriodEnd, false)
        )
      );

    const oldPlan = await db.query.PlanModel.findFirst({
      where: eq(PlanModel.id, oldPlanId),
    });

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
        if (oldPlan) {
          await sendEmail({
            to: user.email,
            subject: "Important: Subscription Price Update",
            html: getPriceChangeNotificationHTML(
              user.name || "Valued Customer",
              oldPlan.amount,
              newAmount,
              subscription.currentPeriodEnd
            )
          });

          // Create in-app notification
          await createNotification(
            user.id,
            "Subscription Price Update",
            `Our subscription price has changed from $${(oldPlan.amount / 100).toFixed(2)} to $${(newAmount / 100).toFixed(2)}. Your current subscription will not auto-renew. Please review your options before it ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
            "system"
          );
        }

        console.log(`✅ Notified user ${user.email} about price change`);

      } catch (error) {
        console.error(`Failed to notify user ${user.id}:`, error);
      }
    });

    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);

    return activeSubscriptions.length;

  } catch (error: any) {
    console.error("Error updating price for all users:", error);
    throw error;
  }
};




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
        ...subscription.metadata
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

  // Get the subscribed plan and latest plan
  const subscribedPlan = await db.query.PlanModel.findFirst({
    where: eq(PlanModel.id, planId),
  });

  const latestPlan = await db.query.PlanModel.findFirst({
    where: and(
      eq(PlanModel.name, "Monthly Plan"),
      eq(PlanModel.isLatest, true)
    ),
  });

  const isSubscribingToOldPrice = subscribedPlan?.id !== latestPlan?.id;

  // Check if user already has ANY subscription
  const existingSubscription = await db.query.SubscriptionModel.findFirst({
    where: eq(SubscriptionModel.userId, userId),
  });

  if (existingSubscription) {
    // UPDATE existing subscription
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
    
    console.log(`Updated subscription for user ${userId} with plan ${planId}`);
  } else {
    // Create new subscription
    await db.insert(SubscriptionModel).values({
      userId,
      planId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: periodEnd,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    });
    
    console.log(`Created new subscription for user ${userId} with plan ${planId}`);
  }

  // Update user's subscription status
  await db
    .update(UserModel)
    .set({ 
      hasActiveSubscription: subscription.status === "active" 
    })
    .where(eq(UserModel.id, userId));

  // If user subscribed to old price (rare case), notify them
  if (isSubscribingToOldPrice && subscribedPlan && latestPlan) {
    const user = await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: { email: true, name: true }
    });

    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Important: You subscribed to a previous price",
          html: getOldPriceSubscriptionHTML(
            user.name || "Customer",
            subscribedPlan.amount,
            latestPlan.amount,
            periodEnd
          )
        });

        await createNotification(
          userId,
          "Subscribed to Previous Price",
          `You subscribed at a previous price of $${(subscribedPlan.amount / 100).toFixed(2)}. The current price is $${(latestPlan.amount / 100).toFixed(2)}. Your subscription will not auto-renew.`,
          "system"
        );

        console.log(`⚠️ User ${user.email} subscribed to old price, notified them`);
      } catch (error) {
        console.error(`Failed to notify user about old price subscription:`, error);
      }
    }
  }
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
        stripeSubscriptionId: subscription.id,
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
    await db
      .update(UserModel)
      .set({ hasActiveSubscription: true })
      .where(eq(UserModel.id, userId));
  } else if (subscription.status === "canceled") {
    await db
      .update(UserModel)
      .set({ hasActiveSubscription: false })
      .where(eq(UserModel.id, userId));
  } else if (subscription.status === "past_due") {
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