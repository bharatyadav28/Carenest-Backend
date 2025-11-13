import express from "express";
import {
  createOrUpdatePolicy,
  getPolicyByType,
  getAllPolicies,
  deletePolicy,
} from "./policy.controller";
import { validateData } from "../../middlewares/validation";
import { createOrUpdatePolicySchema } from "./policy.model";
import { auth, isAdmin } from "../../middlewares/auth";

const policyRouter = express.Router();

// Public routes
policyRouter.get("/", getAllPolicies);
policyRouter.get("/getPolicyByType/:type", getPolicyByType);

// Admin only routes
policyRouter.post("/createOrUpdatePolicy", auth, isAdmin, validateData(createOrUpdatePolicySchema), createOrUpdatePolicy);
policyRouter.delete("/:type", auth, isAdmin, deletePolicy);

export default policyRouter;