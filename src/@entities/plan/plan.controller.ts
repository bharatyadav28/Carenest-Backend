import { Request, Response } from "express";
import { db } from "../../db";
import { PlanModel } from "./plan.model";
import { getTableColumns } from "drizzle-orm";

export const createCareGiverPlan = async (req: Request, res: Response) => {
  const incomingData = req.cleanBody;

  const newPlan = await db.insert(PlanModel).values(incomingData).returning();
  if (!newPlan || newPlan.length === 0) {
    throw new Error("Failed to create plan");
  }

  res.status(201).json({
    success: true,
    message: "Plan created successfully",
  });
};

export const getCareGiverPlans = async (req: Request, res: Response) => {
  const plans = await db.select().from(PlanModel).orderBy(PlanModel.createdAt);

  res.status(201).json({
    success: true,
    message: "Plan fetched successfully",
    data: {
      plans,
    },
  });
};
