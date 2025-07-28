import { Request, Response } from "express";

import { UserModel } from "../user";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../errors";
import { hashPassword } from "../../helpers/passwordEncrpt";

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
  const { name, email, newPassword } = req.body;

  let newData: { name: string; email: string; password?: string } = {
    name,
    email,
  };

  if (newPassword) {
    const hashedPassword = await hashPassword(newPassword);
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
