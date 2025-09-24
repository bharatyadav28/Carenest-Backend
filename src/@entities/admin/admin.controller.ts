import { Request, Response } from "express";

import { UserModel } from "../user/user.model";
import { db } from "../../db";
import { and, count, eq, sql } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../errors";
import { hashPassword } from "../../helpers/passwordEncrpt";
import { s3Uploadv4 } from "../../helpers/s3";
import { cdnURL, generateRandomString } from "../../helpers/utils";
import { getAdminCreatedAccountHTML } from "../../helpers/emailText";
import sendEmail from "../../helpers/sendEmail";
import { email } from "zod";
import { BookingModel } from "../booking/booking.model";

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

export const dashboardStats = async (req: Request, res: Response) => {
  const userStatsPromise = db
    .select({
      totalSeekers:
        sql<number>`COUNT(CASE WHEN ${UserModel.role} = 'user' THEN 1 END)::integer`.as(
          "totalGivers"
        ),
      totalGivers:
        sql<number>`COUNT(CASE WHEN ${UserModel.role}='giver' THEN 1 END)::integer`.as(
          "totalGivers"
        ),
    })
    .from(UserModel)
    .where(
      and(eq(UserModel.isDeleted, false), eq(UserModel.isEmailVerified, true))
    );

  const bookingsCountPromise = db
    .select({
      totalBookings: count(BookingModel.id),
      completedBookings:
        sql<number>`COUNT(CASE WHEN ${BookingModel.status} = 'completed' THEN 1 END)::integer`.as(
          "completedBookings"
        ),
      pendingBookings:
        sql<number>`COUNT(CASE WHEN ${BookingModel.status} = 'pending' THEN 1 END)::integer`.as(
          "pendingBookings"
        ),
      acceptedBookings:
        sql<number>`COUNT(CASE WHEN ${BookingModel.status} = 'accepted' THEN 1 END)::integer`.as(
          "activeBookings"
        ),
      cancelledBookings:
        sql<number>`COUNT(CASE WHEN ${BookingModel.status} = 'cancelled' THEN 1 END)::integer`.as(
          "cancelledBookings"
        ),
    })
    .from(BookingModel);

  const [userStats, bookingsCount] = await Promise.all([
    userStatsPromise,
    bookingsCountPromise,
  ]);

  const stats = {
    ...userStats[0],
    ...bookingsCount[0],
  };

  return res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully",
    data: {
      stats,
    },
  });
};

export const getAdminId = async (req: Request, res: Response) => {
  const admin = await db
    .select({ id: UserModel.id })
    .from(UserModel)
    .where(eq(UserModel.role, "admin"))
    .limit(1);

  if (!admin || admin.length === 0) {
    throw new NotFoundError("Admin not found");
  }

  return res.status(200).json({
    success: true,
    message: "Admin ID fetched successfully",
    data: {
      admin: admin[0],
    },
  });
};
