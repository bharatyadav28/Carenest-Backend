import express from "express";
import { getJobProfile, updateJobProfile } from "./jobProfile.controller";
import { validateData } from "../../middlewares/validation";
import { createJobProfileSchema } from "./jobProfile.model";

const jobProfileRouter = express.Router();

jobProfileRouter
  .route("/")
  .get(getJobProfile)
  .put(validateData(createJobProfileSchema), updateJobProfile);

export default jobProfileRouter;
