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
} from "./user.controller";
import { validateData } from "../../middlewares/validation";
import {
  createUserSchema,
  signinUserSchema,
  updateUserSchema,
} from "./user.model";
import { auth, isGiver } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";

const userRouter = express.Router();

userRouter.route("/signup").post(validateData(createUserSchema), signup);
userRouter.route("/signup/otp").post(resendOTPSignup);

userRouter.route("/signin").post(validateData(signinUserSchema), signin);
userRouter.route("/verify-email").post(verifyEmail);

userRouter.route("/google-auth").post(googleAuth);

userRouter.route("/forgot-password").post(forgotPassword);
userRouter.route("/reset-password").put(resetPassword);
userRouter.route("/change-password").put(auth, changePassword);

userRouter
  .route("/my-profile")
  .get(auth, getProfile)
  .put(auth, validateData(updateUserSchema), updateProfile);

userRouter
  .route("/avatar")
  .put(auth, upload.single("file"), updateAvatar)
  .delete(auth, removeAvatar);

userRouter.route("/").delete(auth, deleteUsersAcccount);

export default userRouter;
