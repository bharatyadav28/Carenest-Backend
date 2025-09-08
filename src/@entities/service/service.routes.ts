import express from "express";
import {
  addService,
  getServices,
  getServicesHighlight,
  getServicesName,
} from "./service.controller";
import { validateData } from "../../middlewares/validation";
import { CreateServiceSchema } from "./service.model";

const serviceRouter = express.Router();

serviceRouter
  .route("/")
  .get(getServices)
  .post(validateData(CreateServiceSchema), addService);

serviceRouter.route("/names").get(getServicesName);
serviceRouter.route("/highlights").get(getServicesHighlight);

export default serviceRouter;
