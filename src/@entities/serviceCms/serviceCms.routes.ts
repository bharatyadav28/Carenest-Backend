import express from "express";
import {
  createService,
  getAllServicesForHomepage,
  getServiceById,
  getServicesByCareType,
  getAllServices,
  updateService,
  deleteService,
} from "./serviceCms.controller";
import { validateData } from "../../middlewares/validation";
import { createServiceSchema, updateServiceSchema } from "./serviceCms.model";
import { auth, isAdmin } from "../../middlewares/auth";

const serviceCmsRouter = express.Router();

// Public routes
serviceCmsRouter.get("/homepage", getAllServicesForHomepage);
serviceCmsRouter.get("/care-type/:careType", getServicesByCareType);
serviceCmsRouter.get("/:id", getServiceById);

// Admin only routes
serviceCmsRouter.post("/", auth, isAdmin, validateData(createServiceSchema), createService);
serviceCmsRouter.get("/", auth, isAdmin, getAllServices);
serviceCmsRouter.put("/:id", auth, isAdmin, validateData(updateServiceSchema), updateService);
serviceCmsRouter.delete("/:id", auth, isAdmin, deleteService);

export default serviceCmsRouter;