import express from "express";

import {
  changePassword,
  deleteGiversAcccount,
  getProfile,
  removeAvatar,
  updateAvatar,
  updateProfile,
} from "./giver.controller";
import { validateData } from "../../middlewares/validation";
import { updateUserSchema } from "../user/user.model";
import { upload } from "../../helpers/s3";

const giverRouter = express.Router();

giverRouter.route("/change-password").put(changePassword);

giverRouter
  .route("/my-profile")
  .get(getProfile)
  .put(validateData(updateUserSchema), updateProfile);

giverRouter
  .route("/avatar")
  .put(upload.single("file"), updateAvatar)
  .delete(removeAvatar);

giverRouter.route("/").delete(deleteGiversAcccount);

export default giverRouter;
