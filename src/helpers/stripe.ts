import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "../db";
import { OrderModel } from "../@entities/order//order.model";
import { TransactionModel } from "../@entities/order/transaction.model";
import { UserModel } from "../@entities/user/user.model";
import { PlanModel } from "../@entities/plan/plan.model";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const frontendDomain = process.env.FRONTEND_URL || "http://localhost:3000";

export const createCheckoutSession = async ({
  duration,
  userId,
  planId,
  planType,
  amount,
}: {
  duration: number;
  userId: string;
  planId: string;
  planType: string;
  amount: number;
}) => {
  const unitAmount = Math.round(Number(amount) * 100);
  const metaData = {
    duration: duration.toString(),
    userId,
    planId,
    planType,
    amount: amount.toString(),
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${planType} Plan Subscription`,
            description: `Valid for ${duration} days`,
            metadata: metaData,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    metadata: metaData,
    mode: "payment",
    success_url: `${frontendDomain}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendDomain}/subscription?cancelled=true`,
    customer_email: await db.query.UserModel.findFirst({
      where: eq(UserModel.id, userId),
      columns: { email: true }
    }).then(user => user?.email),
  });

  return session;
};

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  console.log("🔔 Webhook received");
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"] as string;
  
  if (!signature) {
    console.error("❌ No Stripe signature found");
    return res.status(400).json({ error: "No signature found" });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
    
    console.log(`✅ Webhook verified: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log(`💰 Payment completed for session: ${session.id}`);
        
        // Calculate subscription dates (30 days for monthly plan)
        const now = new Date();
        const duration = parseInt(session.metadata?.duration || "30");
        const subscriptionEndDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
        
        try {
          // Update order and user in transaction
          await db.transaction(async (tx) => {
            // Update order
            const [order] = await tx
              .update(OrderModel)
              .set({
                status: 'completed',
                stripePaymentIntentId: session.payment_intent as string,
                subscriptionStartDate: now,
                subscriptionEndDate,
                updatedAt: new Date(),
              })
              .where(eq(OrderModel.stripeSessionId, session.id))
              .returning();
            
            if (!order) {
              console.error(`❌ Order not found for session: ${session.id}`);
              return;
            }
            
            // Update user subscription status
            await tx
              .update(UserModel)
              .set({
                hasSubscription: true,
                subscriptionStartDate: now,
                subscriptionEndDate,
                subscriptionPlanId: session.metadata?.planId,
              })
              .where(eq(UserModel.id, session.metadata?.userId));
            
            // Create transaction record
            await tx.insert(TransactionModel).values({
              orderId: order.id,
              stripeEventId: event.id,
              stripeEventType: event.type,
              amount: session.amount_total || 0,
              currency: session.currency?.toUpperCase() || 'USD',
              status: 'completed',
              metadata: session,
            });
            
            console.log(`✅ Updated order: ${order.id} for user: ${session.metadata?.userId}`);
          });
        } catch (error) {
          console.error(`❌ Error processing webhook:`, error);
        }
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        await db
          .update(OrderModel)
          .set({ 
            status: 'expired',
            updatedAt: new Date(),
          })
          .where(eq(OrderModel.stripeSessionId, session.id));
        
        console.log(`❌ Session expired: ${session.id}`);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const order = await db
          .select({ id: OrderModel.id })
          .from(OrderModel)
          .where(eq(OrderModel.stripePaymentIntentId, paymentIntent.id))
          .limit(1);
        
        if (order[0]) {
          await db
            .update(OrderModel)
            .set({ 
              status: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(OrderModel.id, order[0].id));
          
          await db.insert(TransactionModel).values({
            orderId: order[0].id,
            stripeEventId: event.id,
            stripeEventType: event.type,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency?.toUpperCase() || 'USD',
            status: 'failed',
            metadata: paymentIntent,
          });
        }
        
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
    
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Helper to get subscription status
export const getSubscriptionStatus = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: {
      hasSubscription: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      subscriptionPlanId: true,
    }
  });
  
  if (!user?.hasSubscription || !user.subscriptionEndDate) {
    return { 
      active: false,
      message: "No active subscription"
    };
  }
  
  const now = new Date();
  const endDate = new Date(user.subscriptionEndDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    active: endDate > now,
    startDate: user.subscriptionStartDate,
    endDate: user.subscriptionEndDate,
    planId: user.subscriptionPlanId,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    message: endDate > now 
      ? `Subscription active, ${daysRemaining} days remaining` 
      : "Subscription expired",
  };
};