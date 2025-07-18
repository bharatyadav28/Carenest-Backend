import express from "express";
import { validateData } from "../../middlewares/validation";
import { getAbout, updateAbout } from "./about.controller";
import { createAboutSchema } from "./about.model";

const aboutRouter = express.Router();

aboutRouter
  .route("/")
  .get(getAbout)
  .put(validateData(createAboutSchema), updateAbout);

export default aboutRouter;
