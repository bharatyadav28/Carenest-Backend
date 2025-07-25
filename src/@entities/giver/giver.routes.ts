import express from "express";

import {
  caregiverDetails,
  changePassword,
  deleteGiversAcccount,
  getProfile,
  removeAvatar,
  searchCaregivers,
  updateAvatar,
  updateProfile,
} from "./giver.controller";
import { validateData } from "../../middlewares/validation";
import { updateUserSchema } from "../user/user.model";
import { upload } from "../../helpers/s3";
import { isGiver } from "../../middlewares/auth";

const giverRouter = express.Router();

giverRouter.route("/change-password").put(isGiver, changePassword);

giverRouter
  .route("/my-profile")
  .get(isGiver, getProfile)
  .put(isGiver, validateData(updateUserSchema), updateProfile);

giverRouter
  .route("/avatar")
  .put(isGiver, upload.single("file"), updateAvatar)
  .delete(isGiver, removeAvatar);

giverRouter.route("/").delete(isGiver, deleteGiversAcccount);

giverRouter.route("/search").get(searchCaregivers);
giverRouter.route("/search/:id").get(caregiverDetails);

export default giverRouter;
