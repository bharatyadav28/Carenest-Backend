import { Request, Response } from "express";

import { UserModel } from "../user/user.model";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../errors";
import { hashPassword } from "../../helpers/passwordEncrpt";
import { s3Uploadv4 } from "../../helpers/s3";
import { cdnURL, generateRandomString } from "../../helpers/utils";
import { getAdminCreatedAccountHTML } from "../../helpers/emailText";
import sendEmail from "../../helpers/sendEmail";
import { email } from "zod";

export const getAdminProfile = async (req: Request, res: Response) => {
  const profile = await db.query.UserModel.findFirst({
    where: eq(UserModel.role, "admin"),
    columns: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!profile) {
    throw new NotFoundError("No admin data exists");
  }

  return res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: {
      profile,
    },
  });
};

export const updateAdminProfile = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  let newData: { name: string; email: string; password?: string } = {
    name,
    email,
  };

  if (password) {
    const hashedPassword = await hashPassword(password);
    newData.password = hashedPassword;
  }

  const updatedProfile = await db
    .update(UserModel)
    .set(newData)
    .where(eq(UserModel.role, "admin"))
    .returning();
  if (!updatedProfile || updatedProfile?.length == 0) {
    throw new Error("Profile updation failed");
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
};

export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new NotFoundError("Please upload a file");
  }

  const folder = "files";
  const uploadResult = await s3Uploadv4(req.file, folder);

  // Generate image URL
  const result = `${cdnURL}/${uploadResult.Key}`;

  return res.status(200).json({
    success: true,
    message: "Document uploaded successfully",
    data: { url: result },
  });
};
