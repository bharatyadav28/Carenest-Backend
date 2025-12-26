// @entities/plan/plan.routes.ts - UPDATED
import express from "express";
import { 
  createMonthlyPlan, 
  getPlans, 
  updatePlanPrice, 
  getPriceHistory 
} from "./plan.controller";
import { isAdmin } from "../../middlewares/auth";

const planRouter = express.Router();

// Create $10 plan (admin, one time)
planRouter.post("/create-monthly", isAdmin, createMonthlyPlan);

// Get current plan (latest price) - public
planRouter.get("/", getPlans);

// Get price history - admin only
planRouter.get("/history", isAdmin, getPriceHistory);

// Update plan price (admin only)
planRouter.patch("/:planId/price", isAdmin, updatePlanPrice);



export default planRouter;