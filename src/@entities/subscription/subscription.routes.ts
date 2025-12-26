// @entities/subscription/subscription.routes.ts
import express from "express";
import {
  createSubscriptionCheckoutController,
  getMySubscription,
  cancelSubscription,
  reactivateSubscription, // Add this import
  checkSubscriptionStatus,
  renewSubscription,
  getAllSubscriptions,
} from "./subscription.controller";
import { isGiver, isAdmin } from "../../middlewares/auth";

const subscriptionRouter = express.Router();

// User routes
subscriptionRouter.post("/checkout", isGiver, createSubscriptionCheckoutController);
subscriptionRouter.get("/my", isGiver, getMySubscription);
subscriptionRouter.post("/cancel", isGiver, cancelSubscription);
subscriptionRouter.post("/reactivate", isGiver, reactivateSubscription); // Add this line
subscriptionRouter.get("/check", isGiver, checkSubscriptionStatus);
 subscriptionRouter.post("/renew", isGiver, renewSubscription);

// Admin routes
subscriptionRouter.get("/all", isAdmin, getAllSubscriptions);

export default subscriptionRouter;