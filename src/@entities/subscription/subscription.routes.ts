// @entities/subscription/subscription.routes.ts - UPDATED
import express from "express";
import {
  createSubscriptionCheckoutController,
  getMySubscription,
  cancelSubscription,
  reactivateSubscription,
  reactivateSubscriptionWithPriceUpdate,
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
subscriptionRouter.post("/reactivate", isGiver, reactivateSubscription);
subscriptionRouter.get("/check", isGiver, checkSubscriptionStatus);
subscriptionRouter.post("/renew", isGiver, renewSubscription);
subscriptionRouter.post("/reactivate-with-price-update", isGiver, reactivateSubscriptionWithPriceUpdate);

// Admin routes
subscriptionRouter.get("/all", isAdmin, getAllSubscriptions);

export default subscriptionRouter;