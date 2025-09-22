import express from "express";

import { isAdmin } from "../../middlewares/auth";
import {
  dashboardStats,
  getAdminProfile,
  updateAdminProfile,
  uploadFile,
} from "./admin.controller";
import { upload } from "../../helpers/s3";
import { validateData } from "../../middlewares/validation";

const adminRouter = express.Router();

adminRouter
  .route("/profile")
  .get(isAdmin, getAdminProfile)
  .put(isAdmin, updateAdminProfile);

adminRouter.post("/upload-file", isAdmin, upload.single("file"), uploadFile);

adminRouter.get("/dashboard-stats", isAdmin, dashboardStats);

export default adminRouter;
