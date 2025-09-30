import { Request, Response } from "express";
import { getPlanById } from "../plan";
import { NotFoundError } from "../../errors";
import { createCheckoutSession } from "../../helpers/stripe";

export const createStripeSession = async (req: Request, res: Response) => {
  const { priceID } = req.body;

  const existingPlan = await getPlanById(priceID);
  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  const session = await createCheckoutSession({
    duration: existingPlan.duration,
    userId: req.user.id,
    planId: existingPlan.id,
    planType: existingPlan.type,
    amount: existingPlan.amount,
  });

  res.status(201).json({
    success: true,
    message: "Session created successfully",
    data: { sessionId: session.id, checkoutUrl: session.url },
  });
  // res.redirect(303, session.url);
};
