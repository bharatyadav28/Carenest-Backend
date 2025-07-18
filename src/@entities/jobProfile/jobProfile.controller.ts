import { Request, Response } from "express";
import { JobProfileModel } from "./jobProfile.model";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

export const updateJobProfile = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const porfileData = { ...req.cleanBody, userId, updatedAt: new Date() };

  const existingProfileData = await db.query.JobProfileModel.findFirst({
    where: eq(JobProfileModel.userId, userId),
  });

  if (existingProfileData) {
    const updatedProfileData = await db
      .update(JobProfileModel)
      .set(porfileData)
      .where(eq(JobProfileModel.userId, userId))
      .returning();

    if (updatedProfileData?.length == 0) {
      throw new Error("Job Profile data updation failed");
    }
  } else {
    const profileData = await db
      .insert(JobProfileModel)
      .values(porfileData)
      .returning();

    if (profileData?.length == 0) {
      throw new Error("Job Profile data insertion failed");
    }
  }

  return res.status(200).json({
    success: true,
    message: "Job profile data updated successfully",
  });
};

export const getJobProfile = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const existingProfileData = await db.query.JobProfileModel.findFirst({
    where: eq(JobProfileModel.userId, userId),
  });

  if (!existingProfileData) {
    throw new Error("No job profile data exists");
  }

  return res.status(200).json({
    success: true,
    message: "Job profile data fetched successfully",
    data: {
      jobProfileData: existingProfileData,
    },
  });
};
