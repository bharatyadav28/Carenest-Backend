import express from "express";

import {
  changePassword,
  deleteGiversAcccount,
  getProfile,
  updateAvatar,
  updateProfile,
} from "./giver.controller";
import { validateData } from "../../middlewares/validation";
import { updateUserSchema } from "../user/user.model";

const giverRouter = express.Router();

giverRouter.route("/change-password").put(changePassword);
giverRouter
  .route("/my-profile")
  .get(getProfile)
  .put(validateData(updateUserSchema), updateProfile);
giverRouter.route("/avatar").put(updateAvatar);
giverRouter.route("/").delete(deleteGiversAcccount);

export default giverRouter;
