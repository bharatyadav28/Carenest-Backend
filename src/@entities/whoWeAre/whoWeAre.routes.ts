import express from "express";
import {
  createWhoWeAre,
  getWhoWeAre,
  updateWhoWeAre,
  deleteWhoWeAre,
  updateMainSection,
  updateCaregiverNetworkSection,
  updatePromiseSection,
} from "./whoWeAre.controller";
import { validateData } from "../../middlewares/validation";
import { createWhoWeAreSchema, updateWhoWeAreSchema } from "./whoWeAre.model";
import { auth, isAdmin } from "../../middlewares/auth";

const whoWeAreRouter = express.Router();

// Public route - anyone can view Who We Are page
whoWeAreRouter.get("/", getWhoWeAre);

// Admin only routes
whoWeAreRouter.post("/", auth, isAdmin, validateData(createWhoWeAreSchema), createWhoWeAre);
whoWeAreRouter.put("/:id", auth, isAdmin, validateData(updateWhoWeAreSchema), updateWhoWeAre);
whoWeAreRouter.delete("/:id", auth, isAdmin, deleteWhoWeAre);

// Section-specific update routes
whoWeAreRouter.patch("/:id/main-section", auth, isAdmin, updateMainSection);
whoWeAreRouter.patch("/:id/caregiver-network", auth, isAdmin, updateCaregiverNetworkSection);
whoWeAreRouter.patch("/:id/promise-section", auth, isAdmin, updatePromiseSection);

export default whoWeAreRouter;