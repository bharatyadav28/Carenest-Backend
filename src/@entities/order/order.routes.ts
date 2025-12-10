import express from "express";
import {
  createStripeSession,
  getOrderHistory,
  getCurrentSubscription,
  getTransactionHistory,
  checkSubscriptionStatus,
  getOrderDetails,
} from "./order.controller";
import { isGiver } from "../../middlewares/auth";
import { validateData } from "../../middlewares/validation";
import { createOrderSchema } from "./order.model";

const orderRouter = express.Router();

// Create checkout session (your existing route)
orderRouter.post(
  "/create-checkout-session",
  isGiver,
  validateData(createOrderSchema),
  createStripeSession
);

// New routes for subscription management
orderRouter.get("/history", isGiver, getOrderHistory);
orderRouter.get("/current-subscription", isGiver, getCurrentSubscription);
orderRouter.get("/transactions", isGiver, getTransactionHistory);
orderRouter.get("/check-status", isGiver, checkSubscriptionStatus);
orderRouter.get("/:id", isGiver, getOrderDetails);

export default orderRouter;