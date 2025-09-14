import express from "express";

import { isAdmin } from "../../middlewares/auth";
import {
  createNewGiver,
  getAdminProfile,
  updateAdminProfile,
  uploadFile,
} from "./admin.controller";
import { upload } from "../../helpers/s3";
import { validateData } from "../../middlewares/validation";
import { addGiverSchema } from "./admin.schema";

const adminRouter = express.Router();

adminRouter
  .route("/profile")
  .get(isAdmin, getAdminProfile)
  .put(isAdmin, updateAdminProfile);

adminRouter.post("/upload-file", isAdmin, upload.single("file"), uploadFile);

adminRouter
  .route("/giver")
  .post(isAdmin, validateData(addGiverSchema), createNewGiver);

export default adminRouter;
