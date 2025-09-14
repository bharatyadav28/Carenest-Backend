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

export const createNewGiver = async (req: Request, res: Response) => {
  const data = req.cleanBody;

  const email = data?.email;
  const existingGiver = await db
    .select()
    .from(UserModel)
    .where(and(eq(UserModel.email, email), eq(UserModel.role, "giver")))
    .limit(1);

  if (existingGiver && existingGiver.length > 0) {
    if (existingGiver[0].isEmailVerified) {
      throw new BadRequestError("Giver with this email already exists");
    } else {
      await db.delete(UserModel).where(eq(UserModel.id, existingGiver[0].id));
    }
  }

  const password = generateRandomString(8);
  const hashedPassword = await hashPassword(password);

  const newGiver = await db
    .insert(UserModel)
    .values({
      ...data,
      password: hashedPassword,
      role: "giver",
      isEmailVerified: true,
    })
    .returning();

  if (!newGiver || newGiver.length == 0) {
    throw new Error("New caregiver creation failed");
  }

  // Send welcome email with credentials
  const emailHTML = getAdminCreatedAccountHTML(
    data.name,
    data.email,
    password,
    "giver"
  );

  await sendEmail({
    to: data.email,
    subject: "Welcome to CareWorks - Your Account Credentials",
    html: emailHTML,
  });

  return res.status(201).json({
    success: true,
    message: "New caregiver created successfully",
  });
};
