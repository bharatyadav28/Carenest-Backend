import { Request, Response } from "express";
import { AboutModel } from "./about.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const updateAbout = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const aboutData = { ...req.cleanBody, userId, updatedAt: new Date() };

  const existingAboutData = await db.query.AboutModel.findFirst({
    where: eq(AboutModel.userId, userId),
  });

  if (existingAboutData) {
    const updatedAboutData = await db
      .update(AboutModel)
      .set(aboutData)
      .where(eq(AboutModel.userId, userId))
      .returning();

    if (updatedAboutData?.length == 0) {
      throw new Error("About data updation failed");
    }
  } else {
    const profileData = await db
      .insert(AboutModel)
      .values(aboutData)
      .returning();

    if (profileData?.length == 0) {
      throw new Error("About data insertion failed");
    }
  }

  return res.status(200).json({
    success: true,
    message: "About data updated successfully",
  });
};

export const getAbout = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const existingAboutData = await db.query.AboutModel.findFirst({
    where: eq(AboutModel.userId, userId),
  });

  if (!existingAboutData) {
    throw new Error("No about data exists");
  }

  return res.status(200).json({
    success: true,
    message: "About fetched successfully",
    data: {
      about: existingAboutData.content,
    },
  });
};
