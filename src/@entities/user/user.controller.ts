import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";

import { UserModel } from "./user.model";
import { db } from "../../db";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import { BadRequestError, NotFoundError } from "../../errors";
import { generateAndSendOtp, verifyOtp } from "../otp/otp.service";
import {
  createUser,
  findUserByEmail,
  getUserTokens,
  deleteUser,
  filterUserRole,
  getTemporaryToken,
  getAuthUser,
  updatePassword,
  fetchProfileDetails,
  updateProfileDetails,
  updateUserAvatar,
  removeUserAvatar,
} from "./user.service";
import sendEmail from "../../helpers/sendEmail";
import { getSignupHTML } from "../../helpers/emailText";

export const signup = async (req: Request, res: Response) => {
  const incomingData = req.cleanBody;
  const { email, password, role } = incomingData;
  if (!password) {
    throw new BadRequestError("Please enter password");
  }

  const userRole = filterUserRole(role);

  const hashedPassword = await hashPassword(password);
  const usersData = {
    ...incomingData,
    password: hashedPassword,
    role: userRole,
  };

  const existingUser = await findUserByEmail(email, userRole);
  const isVerified = existingUser?.isEmailVerified;

  if (!existingUser || !isVerified) {
    const deleteUserPromise =
      existingUser && !isVerified
        ? deleteUser(existingUser.id)
        : Promise.resolve();

    const newUserPromise = createUser(usersData);

    const [_, user] = await Promise.all([deleteUserPromise, newUserPromise]);

    if (user) {
      await generateAndSendOtp({
        userId: user.id,
        name: user.name || "user",
        email,
        type: "account_verification",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Otp sent to registered email",
      data: {
        userId: user.id,
      },
    });
  }

  throw new BadRequestError("User with this email already exists");
};

export const resendOTPSignup = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    throw new BadRequestError("Please provide userId");
  }

  const user = await db.query.UserModel.findFirst({
    where: and(eq(UserModel.id, userId), eq(UserModel.isEmailVerified, false)),
    columns: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new NotFoundError(
      "No user with this id exists or email is already verified"
    );
  }

  await generateAndSendOtp({
    userId: user.id,
    name: user.name || "user",
    email: user.email,
    type: "account_verification",
  });

  return res.status(200).json({
    success: true,
    message: "Otp sent to registered email",
    data: {
      userId: user.id,
    },
  });
};

export const signin = async (req: Request, res: Response) => {
  const { email, password: candidatePassword, role } = req.body;

  const userRole = role || "user";

  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole),
      eq(UserModel.isEmailVerified, true)
    ),
    columns: {
      id: true,
      password: true,
      name: true,
    },
  });
  if (!existingUser) {
    throw new NotFoundError("Email is incorrect");
  }

  let isPasswordMatched = false;

  if (existingUser.password) {
    isPasswordMatched = await comparePassword(
      candidatePassword,
      existingUser.password
    );
  }
  if (!isPasswordMatched) {
    throw new BadRequestError("Password is incorrect");
  }

  const { accessToken, refreshToken } = getUserTokens(existingUser.id);

  return res.status(200).json({
    success: true,
    message: "Signin successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code, userId, type } = req.body;
  if (!code || !type) {
    throw new BadRequestError("Please enter both code and type");
  }

  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: { id: true, role: true, email: true, name: true },
  });
  if (!user) {
    throw new NotFoundError("No data with this user id exists.");
  }

  await verifyOtp({ code, userId: user.id, type });

  if (type === "account_verification") {
    const verified = await db
      .update(UserModel)
      .set({ isEmailVerified: true, updatedAt: new Date() })
      .where(eq(UserModel.id, user.id))
      .returning();
    if (!verified) {
      throw new Error("Email verification failed");
    }

    if (user.role === "giver") {
      await sendEmail({
        to: user.email,
        subject: " Welcome to CareWorks – Let’s Get Started!",
        html: getSignupHTML(user?.name || "user"),
      });
    }
  }

  let responseData = {};
  if (type === "account_verification" || type === "two_step_auth") {
    const { accessToken, refreshToken } = getUserTokens(user.id);
    responseData = { accessToken, refreshToken };
  } else if (type === "password_reset") {
    const token = getTemporaryToken(user.id);
    responseData = { token };
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data: {
      ...responseData,
    },
  });
};

export const googleAuth = async (req: Request, res: Response) => {
  const { googleToken, role } = req.body;
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new BadRequestError(`Google login verification failed`);
  }

  const userRole = filterUserRole(role);
  const data = await response.json();
  const { name, email, email_verified } = data;
  const usersData = {
    name,
    email,
    isEmailVerified: true,
    role: userRole,
  };

  if (!email || !email_verified) {
    throw new BadRequestError("Email is inaccessible or not verified");
  }

  let existingUser = await findUserByEmail(email, userRole);
  const isVerified = existingUser?.isEmailVerified;

  if (!existingUser || !isVerified) {
    const deleteUserPromise =
      existingUser && !isVerified
        ? deleteUser(existingUser.id)
        : Promise.resolve();

    const newUserPromise = createUser(usersData);

    const [_, user] = await Promise.all([deleteUserPromise, newUserPromise]);
    if (user) {
      existingUser = user;
    }
  }

  let responseData = {};
  if (existingUser) {
    const { accessToken, refreshToken } = await getUserTokens(existingUser?.id);
    responseData = { accessToken, refreshToken };
  }

  return res.status(200).json({
    success: true,
    message: "Signin successfully",
    data: {
      ...responseData,
    },
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email) {
    throw new BadRequestError("Please enter your email address");
  }

  const userRole = filterUserRole(role);

  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole),
      eq(UserModel.isEmailVerified, true)
    ),
    columns: { id: true, name: true },
  });

  if (!existingUser) {
    throw new BadRequestError("No user with this email address exists");
  }

  await generateAndSendOtp({
    userId: existingUser.id,
    name: existingUser.name || "user",
    email,
    type: "password_reset",
  });

  return res.status(200).json({
    success: true,
    message: "Otp sent to registered email address",
    data: {
      userId: existingUser.id,
    },
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { password, role } = req.body;
  const authHeader = req.headers["authorization"];
  const existingUser = await getAuthUser(authHeader, role, "temporary");
  const hashedPassword = await hashPassword(password);

  const updatedUser = await db
    .update(UserModel)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(UserModel.id, existingUser.id))
    .returning();
  if (!updatedUser) {
    throw new BadRequestError("Password updation failed");
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError("Please provide both current and new password");
  }

  await updatePassword({
    currentPassword,
    newPassword,
    userId,
  });

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await fetchProfileDetails(userId);
  return res.status(200).json({
    success: true,
    message: "Profile details fetched successfully",
    data: {
      user,
    },
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const updatedData = req.cleanBody;
  const userId = req.user.id;

  await updateProfileDetails(userId, updatedData);

  return res.status(200).json({
    success: true,
    message: "Profile details updated successfully",
  });
};

export const updateAvatar = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    throw new BadRequestError("Please upload a file");
  }
  await updateUserAvatar(userId, file);

  return res.status(200).json({
    success: true,
    message: "Profile image updated successfully",
  });
};

export const removeAvatar = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await removeUserAvatar(userId);

  return res.status(200).json({
    success: true,
    message: "Profile image removed successfully",
  });
};

export const deleteUsersAcccount = async (req: Request, res: Response) => {
  const userId = req.user.id;

  await deleteUser(userId);

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
};
