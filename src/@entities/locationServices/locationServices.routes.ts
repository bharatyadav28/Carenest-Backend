import express from "express";
import {
  createLocationService,
  getAllLocationServices,
  getLocationServiceByCityState,
  getLocationServiceById,
  updateLocationService,
  deleteLocationService,
  addService,
  updateService,
  deleteService,
} from "./locationServices.controller";
import { validateData } from "../../middlewares/validation";
import { createLocationServiceSchema, updateLocationServiceSchema, serviceInputSchema } from "./locationServices.model";
import { auth, isAdmin } from "../../middlewares/auth";

const locationServicesRouter = express.Router();

// Public routes
locationServicesRouter.get("/", getAllLocationServices);
locationServicesRouter.get("/city/:city/state/:state", getLocationServiceByCityState);
locationServicesRouter.get("/:id", getLocationServiceById);

// Admin only routes
locationServicesRouter.post("/", auth, isAdmin, validateData(createLocationServiceSchema), createLocationService);
locationServicesRouter.put("/:id", auth, isAdmin, validateData(updateLocationServiceSchema), updateLocationService);
locationServicesRouter.delete("/:id", auth, isAdmin, deleteLocationService);

// Service management routes
locationServicesRouter.post("/:id/services", auth, isAdmin, validateData(serviceInputSchema), addService);
locationServicesRouter.put("/:id/services/:serviceId", auth, isAdmin, validateData(serviceInputSchema), updateService);
locationServicesRouter.delete("/:id/services/:serviceId", auth, isAdmin, deleteService);

export default locationServicesRouter;