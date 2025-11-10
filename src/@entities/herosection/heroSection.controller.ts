import { Request, Response } from "express";
import { HeroSectionModel } from "./heroSection.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const createHeroSection = async (req: Request, res: Response) => {
  const heroData = { 
    ...req.cleanBody, 
    createdAt: new Date(), 
    updatedAt: new Date() 
  };

  const existingHeroSection = await db.query.HeroSectionModel.findFirst();

  if (existingHeroSection) {
    return res.status(400).json({
      success: false,
      message: "Hero section already exists. Use update instead.",
    });
  }

  const newHeroSection = await db
    .insert(HeroSectionModel)
    .values(heroData)
    .returning();

  if (newHeroSection?.length === 0) {
    return res.status(500).json({
      success: false,
      message: "Hero section creation failed",
    });
  }

  return res.status(201).json({
    success: true,
    message: "Hero section created successfully",
    data: {
      heroSection: newHeroSection[0],
    },
  });
};

export const getHeroSection = async (req: Request, res: Response) => {
  try {
    const heroSection = await db.query.HeroSectionModel.findFirst();

    if (!heroSection) {
      return res.status(404).json({
        success: false,
        message: "Hero section not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero section fetched successfully",
      data: {
        heroSection,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateHeroSection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.cleanBody, updatedAt: new Date() };

  try {
    const existingHeroSection = await db.query.HeroSectionModel.findFirst({
      where: eq(HeroSectionModel.id, id),
    });

    if (!existingHeroSection) {
      return res.status(404).json({
        success: false,
        message: "Hero section not found",
      });
    }

    const updatedHeroSection = await db
      .update(HeroSectionModel)
      .set(updateData)
      .where(eq(HeroSectionModel.id, id))
      .returning();

    if (updatedHeroSection?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Hero section update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero section updated successfully",
      data: {
        heroSection: updatedHeroSection[0],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteHeroSection = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existingHeroSection = await db.query.HeroSectionModel.findFirst({
      where: eq(HeroSectionModel.id, id),
    });

    if (!existingHeroSection) {
      return res.status(404).json({
        success: false,
        message: "Hero section not found",
      });
    }

    const deletedHeroSection = await db
      .delete(HeroSectionModel)
      .where(eq(HeroSectionModel.id, id))
      .returning();

    if (deletedHeroSection?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Hero section deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero section deleted successfully",
      data: {
        heroSection: deletedHeroSection[0],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};