import express from "express";
import {
  createCaregiverApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats,
} from "./caregiverApplication.controller";
import { validateData } from "../../middlewares/validation";
import { createCaregiverApplicationSchema, updateApplicationStatusSchema } from "./caregiverApplication.model";
import { auth, isAdmin } from "../../middlewares/auth";

const caregiverApplicationRouter = express.Router();

// Public route - anyone can submit application
caregiverApplicationRouter.post("/", validateData(createCaregiverApplicationSchema), createCaregiverApplication);

// Admin only routes
caregiverApplicationRouter.get("/", auth, isAdmin, getAllApplications);
caregiverApplicationRouter.get("/stats", auth, isAdmin, getApplicationStats);
caregiverApplicationRouter.get("/:id", auth, isAdmin, getApplicationById);
caregiverApplicationRouter.put("/:id/status", auth, isAdmin, validateData(updateApplicationStatusSchema), updateApplicationStatus);
caregiverApplicationRouter.delete("/:id", auth, isAdmin, deleteApplication);

export default caregiverApplicationRouter;