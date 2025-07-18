import express from "express";
import {
  addWhyChooseMe,
  deleteWhyChooseMe,
  getWhyChooseMe,
  updateWhyChooseMe,
} from "./whyChooseMe.controller";
import { validateData } from "../../middlewares/validation";
import { whyChooseMeCreateSchema } from "./whyChooseMe.model";

const whyChooseMeRouter = express.Router();

whyChooseMeRouter
  .route("/")
  .get(getWhyChooseMe)
  .post(validateData(whyChooseMeCreateSchema), addWhyChooseMe);

whyChooseMeRouter
  .route("/:id")
  .put(validateData(whyChooseMeCreateSchema), updateWhyChooseMe)
  .delete(deleteWhyChooseMe);

export default whyChooseMeRouter;
