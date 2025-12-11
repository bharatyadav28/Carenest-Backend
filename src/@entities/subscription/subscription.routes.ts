import express from "express";
import {
  createSubscriptionCheckoutController,
  getMySubscription,
  cancelSubscription,
  checkSubscriptionStatus,
  getAllSubscriptions,
} from "./subscription.controller";
import { isGiver, isAdmin } from "../../middlewares/auth";

const subscriptionRouter = express.Router();

// User routes
subscriptionRouter.post("/checkout", isGiver, createSubscriptionCheckoutController);
subscriptionRouter.get("/my", isGiver, getMySubscription);
subscriptionRouter.post("/cancel", isGiver, cancelSubscription);
subscriptionRouter.get("/check", isGiver, checkSubscriptionStatus);

// Admin routes
subscriptionRouter.get("/all", isAdmin, getAllSubscriptions);

export default subscriptionRouter;