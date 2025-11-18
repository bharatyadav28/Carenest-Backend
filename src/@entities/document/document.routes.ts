import express from "express";
import { isGiver,isAdmin } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";
import {
  deleteCaregiverDocument,
  getCaregiverCertificates,
  getCaregiverDocuments,
  saveCaregiverDocuments,
  saveGiverCertificate,
  uploadGiversDocuments,
} from "./document.controller";

const documentRouter = express.Router();

documentRouter.post(
  "/upload",
  isGiver,isAdmin,
  upload.single("file"),
  uploadGiversDocuments
);

documentRouter
  .route("/")
  .post(isGiver, saveCaregiverDocuments)
  .get(isGiver, getCaregiverDocuments);
documentRouter.delete("/:id", isGiver, deleteCaregiverDocument);

documentRouter
  .route("/certificates")
  .get(isGiver, getCaregiverCertificates)
  .post(isGiver, saveGiverCertificate);

export default documentRouter;
