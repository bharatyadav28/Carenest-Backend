import express from "express";

import {
  signup,
  signin,
  verifyEmail,
  googleAuth,
  forgotPassword,
  resetPassword,
  changePassword,
  resendOTPSignup,
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  deleteUsersAcccount,
  getAllUsersForAdmin,
  getUserProfileforAdmin,
} from "./user.controller";
import { validateData } from "../../middlewares/validation";
import {
  createUserSchema,
  signinUserSchema,
  updateUserSchema,
} from "./user.model";
import { isAdmin, isSeeker } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";

const userRouter = express.Router();

userRouter.route("/signup").post(validateData(createUserSchema), signup);
userRouter.route("/signup/otp").post(resendOTPSignup);

userRouter.route("/signin").post(validateData(signinUserSchema), signin);
userRouter.route("/verify-email").post(verifyEmail);

userRouter.route("/google-auth").post(googleAuth);

userRouter.route("/forgot-password").post(forgotPassword);
userRouter.route("/reset-password").put(resetPassword);
userRouter.route("/change-password").put(isSeeker, changePassword);

userRouter
  .route("/my-profile")
  .get(isSeeker, getProfile)
  .put(isSeeker, validateData(updateUserSchema), updateProfile);

userRouter
  .route("/avatar")
  .put(isSeeker, upload.single("file"), updateAvatar)
  .delete(isSeeker, removeAvatar);

userRouter.route("/").delete(isSeeker, deleteUsersAcccount);

userRouter.route("/all").get(isAdmin, getAllUsersForAdmin);
userRouter.route("/all/:id").get(isAdmin, getUserProfileforAdmin);

export default userRouter;
