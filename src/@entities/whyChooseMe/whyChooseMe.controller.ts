import { Request, Response } from "express";
import { db } from "../../db";
import { whyChooseMeModel } from "./whyChooseMe.model";
import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "../../errors";

export const addWhyChooseMe = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const formattedData = { ...req.cleanBody, userId };

  const newWhyChooseMe = await db
    .insert(whyChooseMeModel)
    .values(formattedData)
    .returning();
  if (!newWhyChooseMe || newWhyChooseMe.length === 0) {
    throw new Error("Failed to add 'Why Choose Me' entry");
  }

  return res.status(201).json({
    success: true,
    message: "'Why Choose Me' entry added successfully",
  });
};

export const updateWhyChooseMe = async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.user.id;
  const formattedData = { ...req.cleanBody, userId, updatedAt: new Date() };

  const updatedWhyChooseMe = await db
    .update(whyChooseMeModel)
    .set(formattedData)
    .where(eq(whyChooseMeModel.id, id))
    .returning();

  if (!updatedWhyChooseMe || updatedWhyChooseMe.length === 0) {
    throw new Error("Failed to update 'Why Choose Me' entry");
  }

  return res.status(200).json({
    success: true,
    message: "'Why Choose Me' entry updated successfully",
  });
};

export const deleteWhyChooseMe = async (req: Request, res: Response) => {
  const id = req.params.id;
  const deletedWhyChooseMe = await db
    .delete(whyChooseMeModel)
    .where(eq(whyChooseMeModel.id, id))
    .returning();

  if (!deletedWhyChooseMe || deletedWhyChooseMe.length === 0) {
    throw new Error("Failed to delete 'Why Choose Me' entry");
  }

  return res.status(200).json({
    success: true,
    message: "'Why Choose Me' entry deleted successfully",
  });
};

export const getWhyChooseMe = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const whyChooseMeEntries = await db
    .select()
    .from(whyChooseMeModel)
    .where(eq(whyChooseMeModel.userId, userId))
    .orderBy(asc(whyChooseMeModel.createdAt));

  if (!whyChooseMeEntries || whyChooseMeEntries.length === 0) {
    throw new NotFoundError("No 'Why Choose Me' entries found for this user");
  }

  return res.status(200).json({
    success: true,
    data: whyChooseMeEntries,
  });
};
