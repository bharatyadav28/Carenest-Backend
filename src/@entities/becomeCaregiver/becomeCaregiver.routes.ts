import express from "express";
import {
  createBecomeCaregiver,
  getBecomeCaregiver,
  updateBecomeCaregiver,
  deleteBecomeCaregiver,
  updatePoints,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "./becomeCaregiver.controller";
import { validateData } from "../../middlewares/validation";
import { createBecomeCaregiverSchema, updateBecomeCaregiverSchema, addTestimonialSchema } from "./becomeCaregiver.model";
import { auth, isAdmin } from "../../middlewares/auth";

const becomeCaregiverRouter = express.Router();

// Public route
becomeCaregiverRouter.get("/", getBecomeCaregiver);

// Admin only routes
becomeCaregiverRouter.post("/", auth, isAdmin, validateData(createBecomeCaregiverSchema), createBecomeCaregiver);
becomeCaregiverRouter.put("/:id", auth, isAdmin, validateData(updateBecomeCaregiverSchema), updateBecomeCaregiver);
becomeCaregiverRouter.delete("/:id", auth, isAdmin, deleteBecomeCaregiver);

// Points and testimonials management routes
becomeCaregiverRouter.put("/:id/points", auth, isAdmin, updatePoints);
becomeCaregiverRouter.post("/:id/testimonials", auth, isAdmin, validateData(addTestimonialSchema), addTestimonial);
becomeCaregiverRouter.put("/:id/testimonials/:testimonialId", auth, isAdmin, validateData(addTestimonialSchema), updateTestimonial);
becomeCaregiverRouter.delete("/:id/testimonials/:testimonialId", auth, isAdmin, deleteTestimonial);

export default becomeCaregiverRouter;