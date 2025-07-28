import express from "express";

import { isAdmin } from "../../middlewares/auth";
import { getAdminProfile, updateAdminProfile } from "./admin.controller";

const adminRouter = express.Router();

adminRouter
  .route("/profile")
  .get(isAdmin, getAdminProfile)
  .put(isAdmin, updateAdminProfile);

export default adminRouter;
