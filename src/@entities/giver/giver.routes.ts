import express from "express";

import {
  caregiverDetails,
  changePassword,
  deleteGiversAcccount,
  getAllGiversForAdmin,
  getCaregivers,
  getGiverZipCode,
  getProfessionalProfileforAdmin,
  getProfile,
  removeAvatar,
  searchCaregivers,
  updateAvatar,
  updateGiverZipCode,
  updateProfile,
} from "./giver.controller";
import { validateData } from "../../middlewares/validation";
import { updateUserSchema } from "../user/user.model";
import { upload } from "../../helpers/s3";
import { isAdmin, isGiver } from "../../middlewares/auth";

const giverRouter = express.Router();

giverRouter.route("/").get(isAdmin, getCaregivers);

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

giverRouter
  .route("/zipcode")
  .put(isGiver, updateGiverZipCode)
  .get(isGiver, getGiverZipCode);

giverRouter.route("/all").get(isAdmin, getAllGiversForAdmin);
giverRouter.route("/all/:id").get(isAdmin, getProfessionalProfileforAdmin);

export default giverRouter;
