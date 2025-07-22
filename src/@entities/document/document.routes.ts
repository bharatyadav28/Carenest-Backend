import express from "express";
import { isGiver } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";
import {
  getCaregiverDocuments,
  saveCaregiverDocuments,
  uploadGiversDocuments,
} from "./document.controller";

const documentRouter = express.Router();

documentRouter.post(
  "/upload",
  isGiver,
  upload.single("file"),
  uploadGiversDocuments
);

documentRouter
  .route("/")
  .post(isGiver, saveCaregiverDocuments)
  .get(isGiver, getCaregiverDocuments);

export default documentRouter;
