import Stripe from "stripe";
import { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const frontendDomain = "http://localhost:3000";

export const createCheckoutSession = async ({
  duration,
  userId,
  planId,
  planType,
  amount,
}) => {
  const unitAmount = Math.round(Number(amount) * 100);
  const metaData = {
    duration: duration,
    userId: userId,
    planId: planId,
    planType: planType,
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Payment for ${planType} Plan`,
            metadata: metaData,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    metadata: metaData,
    mode: "payment",
    success_url: `${frontendDomain}/#/menu/my-account`,
    cancel_url: `${frontendDomain}/#/menu/payment-failed`,
  });

  return session;
};

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  console.log("Webhook received");
  try {
    res.status(200).json({ message: "Acknowleged" });

    let data;
    let eventType;

    let webhookSecret = process.env.STRIPE_ENDPOINT_SECRET;
    if (webhookSecret) {
      let event;
      let signature = req.headers["stripe-signature"];
      const payload = req.body;

      try {
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret
        );

        console.log("webhook verified", event);
      } catch (err) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }
      data = event.data.object;
      eventType = event.type;
    } else {
      data = req.body?.data?.object;
      eventType = req.body?.type;
    }

    if (eventType === "checkout.session.async_payment_succeeded") {
      console.log("Succeded", data);
    }

    if (eventType === "checkout.session.async_payment_failed") {
      console.log("Failed", data);
    }

    if (eventType === "checkout.session.completed") {
      console.log("Completed", data);
    }
  } catch (error) {
    console.log(error);
  }
};
