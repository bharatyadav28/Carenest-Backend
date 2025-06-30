import { eq, and } from "drizzle-orm";

import { db } from "../../db";
import { UserModel } from "./user.model";
import { CreateUserType, RoleType } from "../../types/user-types";
import { getTokenPayload } from "../../helpers/utils";
import { BadRequestError, NotFoundError } from "../../errors";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
  verifyJWTToken,
} from "../../helpers/jwt";

export const findUserByEmail = async (email: string, role?: RoleType) => {
  const userRole = role || "user";
  const existingUser = await db.query.UserModel.findFirst({
    where: and(
      eq(UserModel.email, email),
      eq(UserModel.isDeleted, false),
      eq(UserModel.role, userRole)
    ),
    columns: { id: true, isEmailVerified: true, name: true },
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

export const getUserTokens = (userId: string) => {
  const payload = getTokenPayload(userId);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

export const getTemporaryToken = (userId: string) => {
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

export const filterUserRole = (role?: RoleType) => {
  return role ? (role !== "admin" ? role : "user") : "user";
};

export const getAuthUser = async (
  authHeader?: string,
  role?: RoleType,
  tokenType?: string
) => {
  const userRole = role ? role : "user";
  const accessToken = authHeader && authHeader.split(" ")?.[1];
  if (!accessToken) {
    throw new BadRequestError("Access token missing");
  }

  const payload = verifyJWTToken(accessToken, tokenType);

  if (payload && typeof payload === "object" && "user" in payload) {
    const userId = payload.user.id;
    const existingUser = await db.query.UserModel.findFirst({
      where: and(
        eq(UserModel.id, userId),
        eq(UserModel.isDeleted, false),
        eq(UserModel.role, userRole)
      ),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    return existingUser;
  } else {
    throw new BadRequestError("Invalid token payload");
  }
};
