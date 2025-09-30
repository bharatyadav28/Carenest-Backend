import { eq } from "drizzle-orm";
import { db } from "../../db";
import { PlanModel } from "./plan.model";

export const getPlanById = async (planId: string) => {
  const plan = await db
    .select()
    .from(PlanModel)
    .where(eq(PlanModel.id, planId))
    .limit(1);

  return plan?.[0];
};
