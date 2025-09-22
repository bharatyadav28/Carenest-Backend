import express from "express";
import {
  addService,
  deleteService,
  getServiceById,
  getServices,
  getServicesHighlight,
  getServicesName,
  updateService,
} from "./service.controller";
import { validateData } from "../../middlewares/validation";
import { CreateServiceSchema } from "./service.model";
import { isAdmin } from "../../middlewares/auth";

const serviceRouter = express.Router();

serviceRouter
  .route("/")
  .get(getServices)
  .post(isAdmin, validateData(CreateServiceSchema), addService);

serviceRouter.route("/highlights").get(getServicesHighlight);

serviceRouter.route("/names").get(getServicesName);

serviceRouter
  .route("/:id")
  .get(getServiceById)
  .put(isAdmin, validateData(CreateServiceSchema), updateService)
  .delete(isAdmin, deleteService);

export default serviceRouter;
