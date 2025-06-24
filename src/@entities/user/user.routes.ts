import express from "express";

import { signup, signin } from "./user.controller";
import { validateData } from "../../middlewares/validation";
import { createUserSchema, signinUserSchema } from "./user.model";

const userRouter = express.Router();

userRouter.route("/signup").post(validateData(createUserSchema), signup);
userRouter.route("/signin").post(validateData(signinUserSchema), signin);

export default userRouter;
