import express from "express";
import { isGiver, isAdmin } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";
import {
  deleteCaregiverDocument,
  getCaregiverCertificates,
  getCaregiverDocuments,
  getCaregiverResume,
  getCaregiverWorkPermit,
  saveCaregiverDocuments,
  saveGiverCertificate,
  updateCaregiverDocument,
  uploadGiversDocuments,
} from "./document.controller";

const documentRouter = express.Router();

documentRouter.post(
  "/upload",
  upload.single("file"),
  uploadGiversDocuments
);

documentRouter
  .route("/")
  .post(isGiver, saveCaregiverDocuments)
  .get(isGiver, getCaregiverDocuments);


documentRouter.get("/resume", isGiver, getCaregiverResume);
documentRouter.get("/work-permit", isGiver, getCaregiverWorkPermit);
documentRouter.put("/update", isGiver, updateCaregiverDocument);
documentRouter.delete("/:id", isGiver, deleteCaregiverDocument);

documentRouter
  .route("/certificates")
  .get(isGiver, getCaregiverCertificates)
  .post(isGiver, saveGiverCertificate);

export default documentRouter;