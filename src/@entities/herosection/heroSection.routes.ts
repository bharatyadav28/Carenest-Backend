import express from "express";
import {
  createHeroSection,
  getHeroSection,
  updateHeroSection,
  deleteHeroSection,
} from "./heroSection.controller";
import { validateData } from "../../middlewares/validation";
import { createHeroSectionSchema, updateHeroSectionSchema } from "./heroSection.model";
import { auth, isAdmin } from "../../middlewares/auth";

const heroSectionRouter = express.Router();

// Public route - anyone can view hero section
heroSectionRouter.route("/").get(getHeroSection);

// Admin only routes
heroSectionRouter.route("/")
  .post(auth, isAdmin, validateData(createHeroSectionSchema), createHeroSection);

heroSectionRouter.route("/:id")
  .put(auth, isAdmin, validateData(updateHeroSectionSchema), updateHeroSection)
  .delete(auth, isAdmin, deleteHeroSection);

export default heroSectionRouter;