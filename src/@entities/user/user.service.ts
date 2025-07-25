import { eq, and } from "drizzle-orm";

import { db } from "../../db";
import { UserModel } from "./user.model";
import { UpdateUserType, RoleType } from "../../types/user-types";
import { getTokenPayload } from "../../helpers/utils";
import { BadRequestError, NotFoundError } from "../../errors";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
  verifyJWTToken,
} from "../../helpers/jwt";
import { comparePassword, hashPassword } from "../../helpers/passwordEncrpt";
import { s3Uploadv4 } from "../../helpers/s3";

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

export const createUser = async (userData: any) => {
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

interface updatePasswordParam {
  currentPassword: string;
  newPassword: string;
  userId: string;
}
export const updatePassword = async ({
  currentPassword,
  newPassword,
  userId,
}: updatePasswordParam) => {
  const existingUser = await db.query.UserModel.findFirst({
    where: and(eq(UserModel.id, userId), eq(UserModel.isDeleted, false)),
    columns: {
      id: true,
      password: true,
    },
  });
  if (!existingUser) {
    throw new NotFoundError("No such user exists");
  }

  let isPasswordMatched = false;

  if (existingUser.password) {
    isPasswordMatched = await comparePassword(
      currentPassword,
      existingUser.password
    );
  }
  if (!isPasswordMatched) {
    throw new BadRequestError("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);
  const updatedUser = await db
    .update(UserModel)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(UserModel.id, existingUser.id))
    .returning();
  if (!updatedUser) {
    throw new BadRequestError("Password updation failed");
  }
};

export const fetchProfileDetails = async (userId: string) => {
  const user = await db.query.UserModel.findFirst({
    where: eq(UserModel.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      address: true,
      mobile: true,
      avatar: true,
      gender: true,
    },
  });

  if (!user) {
    throw new NotFoundError("No user with this is exists");
  }

  return user;
};

export const updateProfileDetails = async (
  userId: string,
  updatedData: UpdateUserType
) => {
  const updatedUser = await db
    .update(UserModel)
    .set(updatedData)
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile updation failed");
  }
};

export const updateUserAvatar = async (
  userId: string,
  file: Express.Multer.File
) => {
  if (!file || !(file?.mimetype.split("/")[0] === "image")) {
    throw new BadRequestError("Please upload an image");
  }

  const result = await s3Uploadv4(file, "profile");

  const updatedUser = await db
    .update(UserModel)
    .set({ avatar: result ? result.Key : null })
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile image updation failed");
  }
};

export const removeUserAvatar = async (userId: string) => {
  const updatedUser = await db
    .update(UserModel)
    .set({ avatar: null })
    .where(eq(UserModel.id, userId))
    .returning();

  if (updatedUser.length === 0) {
    throw new Error("Profile image removed successfully");
  }
};
