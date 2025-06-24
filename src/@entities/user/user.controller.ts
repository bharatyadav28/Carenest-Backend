import { Request, Response } from "express";

import userModel from "./user.model";
import { db } from "../../db";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import BadRequestError from "../../errors/bad-request";
import { eq } from "drizzle-orm";
import { getTokenPayload } from "../../helpers/utils";
import { getAccessToken, getRefreshToken } from "../../helpers/jwt";

export const signup = async (req: Request, res: Response) => {
  const incomingData = req.cleanBody;
  const { email, password, role } = incomingData;
  const hashedPassword = await hashPassword(password);
  const userData = {
    ...incomingData,
    password: hashedPassword,
    role: role === "admin" ? "user" : role,
  };

  const existingUser = await db.query.userModel.findFirst({
    where: eq(userModel.email, email),
  });

  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }

  const user = await db.insert(userModel).values(userData).returning();
  if (!user) {
    throw Error("Signup failed");
  }

  return res.status(200).json({
    success: true,
    message: "Signup successfully",
    data: {
      user,
    },
  });
};

export const signin = async (req: Request, res: Response) => {
  const { email, password: candidatePassword } = req.cleanBody;

  const existingUser = await db.query.userModel.findFirst({
    where: eq(userModel.email, email),
    columns: {
      id: true,
      password: true,
    },
  });
  if (!existingUser) {
    throw new BadRequestError("Email is incorrect");
  }

  const isMatchedPassword = await comparePassword(
    candidatePassword,
    existingUser.password
  );
  if (!isMatchedPassword) {
    throw new BadRequestError("Password is incorrect");
  }

  const payload = getTokenPayload(existingUser?.id);
  const accessToken = getAccessToken(payload);
  const refreshToken = getRefreshToken(payload);

  return res.status(200).json({
    success: true,
    message: "Signin successfully",
    data: {
      user: existingUser,
      accessToken,
      refreshToken,
    },
  });
};
