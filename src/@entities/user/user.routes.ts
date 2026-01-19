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
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  updateRequiredBy,
  getRequiredBy,
  bulkUploadUsers,
  sendBulkEmail,
  getUsersForBulkEmail,
  validateUsersForEmail,
} from "./user.controller";
import { validateData } from "../../middlewares/validation";
import {
  createUserByAdminSchema,
  createUserSchema,
  signinUserSchema,
  updateUserByAdminSchema,
  updateUserSchema,
  
 
} from "./user.schema";
import { isAdmin, isSeeker } from "../../middlewares/auth";
import { upload } from "../../helpers/s3";
import { sendBulkEmailSchema } from "./bulk-email.schema";

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

userRouter
  .route("/required-by")
  .get(isSeeker, getRequiredBy)
  .put(isSeeker, updateRequiredBy);

userRouter
  .route("/manage-by-admin")
  .post(isAdmin, validateData(createUserByAdminSchema), createUserByAdmin);

userRouter
  .route("/bulk-upload")
  .post(isAdmin, upload.single("file"), bulkUploadUsers);

userRouter
  .route("/manage-by-admin/:id")
  .put(isAdmin, validateData(updateUserByAdminSchema), updateUserByAdmin)
  .delete(isAdmin, deleteUserByAdmin);

userRouter
  .route("/bulk-email/send")
  .post(isAdmin, validateData(sendBulkEmailSchema), sendBulkEmail);

userRouter
  .route("/bulk-email/users")
  .get(isAdmin, getUsersForBulkEmail);

userRouter
  .route("/bulk-email/validate")
  .post(isAdmin, validateUsersForEmail);

export default userRouter;
