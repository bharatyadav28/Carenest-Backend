import express from "express";

import {
  signup,
  signin,
  verifyEmail,
  googleAuth,
  forgotPassword,
  resetPassword,
} from "./user.controller";
import { validateData } from "../../middlewares/validation";
import { createUserSchema, signinUserSchema } from "./user.model";

const userRouter = express.Router();

userRouter.route("/signup").post(validateData(createUserSchema), signup);
userRouter.route("/signin").post(validateData(signinUserSchema), signin);
userRouter.route("/verify-email").post(verifyEmail);
userRouter.route("/google-auth").post(googleAuth);

userRouter.route("/forgot-password").post(forgotPassword);
userRouter.route("/reset-password").post(resetPassword);

export default userRouter;
