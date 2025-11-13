import express from "express";
import {
  createFooter,
  getFooter,
  updateFooter,
  deleteFooter,
  addLocation,
  updateLocation,
  deleteLocation,
  addSocialLink,
  updateSocialLink,
  deleteSocialLink,
} from "./footer.controller";
import { validateData } from "../../middlewares/validation";
import { createFooterSchema, updateFooterSchema, addLocationSchema, updateLocationSchema, socialLinkInputSchema } from "./footer.model";
import { auth, isAdmin } from "../../middlewares/auth";

const footerRouter = express.Router();

// Public route
footerRouter.get("/", getFooter);

// Admin only routes
footerRouter.post("/", auth, isAdmin, validateData(createFooterSchema), createFooter);
footerRouter.put("/:id", auth, isAdmin, validateData(updateFooterSchema), updateFooter);
footerRouter.delete("/:id", auth, isAdmin, deleteFooter);

// Location management routes
footerRouter.post("/:id/locations", auth, isAdmin, validateData(addLocationSchema), addLocation);
footerRouter.put("/:id/locations", auth, isAdmin, validateData(updateLocationSchema), updateLocation);
footerRouter.delete("/:id/locations", auth, isAdmin, validateData(addLocationSchema), deleteLocation);

// Social links management routes
footerRouter.post("/:id/social-links", auth, isAdmin, validateData(socialLinkInputSchema), addSocialLink);
footerRouter.put("/:id/social-links/:linkId", auth, isAdmin, validateData(socialLinkInputSchema), updateSocialLink);
footerRouter.delete("/:id/social-links/:linkId", auth, isAdmin, deleteSocialLink);

export default footerRouter;