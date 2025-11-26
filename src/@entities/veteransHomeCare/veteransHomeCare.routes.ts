import express from "express";
import {
  createVeteransHomeCare,
  getVeteransHomeCare,
  updateVeteransHomeCare,
  deleteVeteransHomeCare,
  updatePoints,
  addPoint,
  updatePoint,
  deletePoint,
} from "./veteransHomeCare.controller";
import { validateData } from "../../middlewares/validation";
import { createVeteransHomeCareSchema, updateVeteransHomeCareSchema, updatePointsSchema } from "./veteransHomeCare.model";
import { auth, isAdmin } from "../../middlewares/auth";

const veteransHomeCareRouter = express.Router();

// Public route
veteransHomeCareRouter.get("/", getVeteransHomeCare);

// Admin only routes
veteransHomeCareRouter.post("/", auth, isAdmin, validateData(createVeteransHomeCareSchema), createVeteransHomeCare);
veteransHomeCareRouter.put("/:id", auth, isAdmin, validateData(updateVeteransHomeCareSchema), updateVeteransHomeCare);
veteransHomeCareRouter.delete("/:id", auth, isAdmin, deleteVeteransHomeCare);

// Points management routes
veteransHomeCareRouter.put("/:id/points", auth, isAdmin, validateData(updatePointsSchema), updatePoints);
veteransHomeCareRouter.post("/:id/points", auth, isAdmin, addPoint);
veteransHomeCareRouter.put("/:id/points/update", auth, isAdmin, updatePoint);
veteransHomeCareRouter.delete("/:id/points", auth, isAdmin, deletePoint);

export default veteransHomeCareRouter;