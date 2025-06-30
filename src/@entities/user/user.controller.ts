import { Request, Response } from "express";

import { UserModel } from "./user.model";
import { db } from "../../db";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import BadRequestError from "../../errors/bad-request";
import { eq, and } from "drizzle-orm";
import {
  createUser,
  findUserByEmail,
  getUserTokens,
  deleteUser,
} from "./user.service";
import { generateAndSendOtp, verifyOtp } from "../otp/otp.service";
import NotFoundError from "../../errors/not-found";

export const signup = async (req: Request, res: Response) => {
  const incomingData = req.cleanBody;
  const { email, password, role } = incomingData;
  if (!password) {
    throw new BadRequestError("Please enter password");
  }

  const userRole = role === "admin" ? "user" : role;

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
      message: "Signup successfully",
      data: {
        userId: user.id,
      },
    });
  }

  throw new BadRequestError("User with this email already exists");
};

export const signin = async (req: Request, res: Response) => {
  const { email, password: candidatePassword } = req.body;

  const existingUser = await db.query.UserModel.findFirst({
    where: and(eq(UserModel.email, email), eq(UserModel.isDeleted, false)),
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

  await generateAndSendOtp({
    userId: existingUser.id,
    name: existingUser.name || "user",
    email,
    type: "two_step_auth",
  });

  return res.status(200).json({
    success: true,
    message: "Otp sent to registered email",
    data: {
      userId: existingUser.id,
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
    columns: { id: true },
  });
  if (!user) {
    throw new NotFoundError("No data with this user id exists.");
  }

  await verifyOtp({ code, userId: user.id, type });

  if (type === "account_verification") {
    const verified = await db
      .update(UserModel)
      .set({ isEmailVerified: true })
      .where(eq(UserModel.id, user.id))
      .returning();
    if (!verified) {
      throw new Error("Email verification failed");
    }
  }

  let responseData = {};
  if (type === "account_verification" || type === "two_step_auth") {
    const { accessToken, refreshToken } = await getUserTokens(user.id);
    responseData = { accessToken, refreshToken };
  } else if (type === "password_reset") {
    responseData = { userId: user.id };
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

  const userRole = role === "admin" ? "user" : role;
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
