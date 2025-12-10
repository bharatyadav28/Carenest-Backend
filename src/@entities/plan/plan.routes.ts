  import express from "express";
  import { createCareGiverPlan, getCareGiverPlans } from "./plan.controller";
  import { validateData } from "../../middlewares/validation";
  import { createPlanSchema } from "./plan.model";
  import { isGiver } from "../../middlewares/auth";

  const planRouter = express.Router();

  planRouter
    .route("/")
    .post(validateData(createPlanSchema), createCareGiverPlan)
    .get(isGiver, getCareGiverPlans);

  export default planRouter;
