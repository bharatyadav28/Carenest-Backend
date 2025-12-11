import express from "express";
import { createMonthlyPlan, getPlans } from "./plan.controller";
import { isAdmin } from "../../middlewares/auth";

const planRouter = express.Router();

// Create $10 plan (admin, one time)
planRouter.post("/create-monthly", isAdmin, createMonthlyPlan);

// Get plans
planRouter.get("/", getPlans);

export default planRouter;