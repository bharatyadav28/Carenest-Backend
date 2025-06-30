import { eq, and } from "drizzle-orm";

import { db } from "../../db";
import { UserModel } from "./user.model";
import { CreateUserType, RoleType } from "../../types/user-types";
import { getTokenPayload } from "../../helpers/utils";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
} from "../../helpers/jwt";

export const findUserByEmail = async (email: string, role?: RoleType) => {
  const userRole = role || "user";
  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole)
    ),
    columns: { id: true, isEmailVerified: true },
  });
  return existingUser;
};

export const createUser = async (userData: CreateUserType) => {
  const user = await db.insert(UserModel).values(userData).returning();
  if (!user || user?.length === 0) {
    throw Error("Signup failed");
  }
  return user?.[0];
};

export const getUserTokens = async (userId: string) => {
  const payload = getTokenPayload(userId);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

export const getTemporaryToken = async (userId: string) => {
  const payload = getTokenPayload(userId);
  const token = generateTempToken(payload);
  return token;
};

export const deleteUser = async (userId: string) => {
  await db
    .update(UserModel)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(UserModel.id, userId));
};

export const deleteUserPermanently = async (userId: string) => {
  await db.delete(UserModel).where(eq(UserModel.id, userId));
};
