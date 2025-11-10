import express from "express";
import {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
} from "./testimonial.controller";
import { validateData } from "../../middlewares/validation";
import { createTestimonialSchema, updateTestimonialSchema } from "./testimonial.model";
import { auth, isAdmin } from "../../middlewares/auth";

const testimonialRouter = express.Router();

// Public routes
testimonialRouter.route("/").get(getAllTestimonials);
testimonialRouter.route("/:id").get(getTestimonialById);

// Admin only routes
testimonialRouter.route("/")
  .post(auth, isAdmin, validateData(createTestimonialSchema), createTestimonial);

testimonialRouter.route("/:id")
  .put(auth, isAdmin, validateData(updateTestimonialSchema), updateTestimonial)
  .delete(auth, isAdmin, deleteTestimonial);

export default testimonialRouter;