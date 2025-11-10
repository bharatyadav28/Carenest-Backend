import express from "express";
import {
  createResources,
  getResources,
  updateResources,
  deleteResources,
  addResourceCard,
  updateResourceCard,
  deleteResourceCard,
  getResourceCardById,
} from "./resources.controller";
import { validateData } from "../../middlewares/validation";
import { createResourcesSchema, updateResourcesSchema, resourceCardInputSchema } from "./resources.model";
import { auth, isAdmin } from "../../middlewares/auth";

const resourcesRouter = express.Router();

// Public routes
resourcesRouter.get("/", getResources);
resourcesRouter.get("/:id/cards/:cardId", getResourceCardById);

// Admin only routes
resourcesRouter.post("/", auth, isAdmin, validateData(createResourcesSchema), createResources);
resourcesRouter.put("/:id", auth, isAdmin, validateData(updateResourcesSchema), updateResources);
resourcesRouter.delete("/:id", auth, isAdmin, deleteResources);

// Resource card management routes
resourcesRouter.post("/:id/cards", auth, isAdmin, validateData(resourceCardInputSchema), addResourceCard);
resourcesRouter.put("/:id/cards/:cardId", auth, isAdmin, validateData(resourceCardInputSchema), updateResourceCard);
resourcesRouter.delete("/:id/cards/:cardId", auth, isAdmin, deleteResourceCard);

export default resourcesRouter;