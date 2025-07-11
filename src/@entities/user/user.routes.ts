import express from "express";

import {
  signup,
  signin,
  verifyEmail,
  googleAuth,
  forgotPassword,
  resetPassword,
  changePassword,
} from "./user.controller";
import { validateData } from "../../middlewares/validation";
import { createUserSchema, signinUserSchema } from "./user.model";
import { auth } from "../../middlewares/auth";

const userRouter = express.Router();

userRouter.route("/signup").post(validateData(createUserSchema), signup);
userRouter.route("/signin").post(validateData(signinUserSchema), signin);
userRouter.route("/verify-email").post(verifyEmail);
userRouter.route("/google-auth").post(googleAuth);

userRouter.route("/forgot-password").post(forgotPassword);
userRouter.route("/reset-password").put(resetPassword);
userRouter.route("/change-password").put(auth, changePassword);

export default userRouter;
