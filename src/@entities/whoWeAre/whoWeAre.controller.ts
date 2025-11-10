import { Request, Response } from "express";
import { WhoWeAreModel } from "./whoWeAre.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const createWhoWeAre = async (req: Request, res: Response) => {
  try {
    const whoWeAreData = { 
      ...req.cleanBody, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst();

    if (existingWhoWeAre) {
      return res.status(400).json({
        success: false,
        message: "Who We Are page already exists. Use update instead.",
      });
    }

    const newWhoWeAre = await db
      .insert(WhoWeAreModel)
      .values(whoWeAreData)
      .returning();

    if (newWhoWeAre?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Who We Are page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Who We Are page created successfully",
      data: {
        whoWeAre: newWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Create Who We Are page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getWhoWeAre = async (req: Request, res: Response) => {
  try {
    const whoWeAre = await db.query.WhoWeAreModel.findFirst();

    if (!whoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    // Ensure images array is always returned (not null)
    const formattedWhoWeAre = {
      ...whoWeAre,
      images: whoWeAre.images || [],
    };

    return res.status(200).json({
      success: true,
      message: "Who We Are page fetched successfully",
      data: {
        whoWeAre: formattedWhoWeAre,
      },
    });
  } catch (error) {
    console.error("Get Who We Are page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateWhoWeAre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst({
      where: eq(WhoWeAreModel.id, id),
    });

    if (!existingWhoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    // Validate that images array always has exactly 4 items when being updated
    if (updateData.images && updateData.images.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Exactly 4 images are required",
      });
    }

    const updatedWhoWeAre = await db
      .update(WhoWeAreModel)
      .set(updateData)
      .where(eq(WhoWeAreModel.id, id))
      .returning();

    if (updatedWhoWeAre?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Who We Are page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Who We Are page updated successfully",
      data: {
        whoWeAre: updatedWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Update Who We Are page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteWhoWeAre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst({
      where: eq(WhoWeAreModel.id, id),
    });

    if (!existingWhoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    const deletedWhoWeAre = await db
      .delete(WhoWeAreModel)
      .where(eq(WhoWeAreModel.id, id))
      .returning();

    if (deletedWhoWeAre?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Who We Are page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Who We Are page deleted successfully",
      data: {
        whoWeAre: deletedWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Delete Who We Are page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Section-specific update endpoints
export const updateMainSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mainHeading, mainDescription, images } = req.body;

    if (images && images.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Exactly 4 images are required",
      });
    }

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst({
      where: eq(WhoWeAreModel.id, id),
    });

    if (!existingWhoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    const updateData: any = { updatedAt: new Date() };
    if (mainHeading !== undefined) updateData.mainHeading = mainHeading;
    if (mainDescription !== undefined) updateData.mainDescription = mainDescription;
    if (images !== undefined) updateData.images = images;

    const updatedWhoWeAre = await db
      .update(WhoWeAreModel)
      .set(updateData)
      .where(eq(WhoWeAreModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Main section updated successfully",
      data: {
        whoWeAre: updatedWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Update main section error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateCaregiverNetworkSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { caregiverNetworkHeading, caregiverNetworkDescription, caregiverNetworkImage } = req.body;

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst({
      where: eq(WhoWeAreModel.id, id),
    });

    if (!existingWhoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    const updateData: any = { updatedAt: new Date() };
    if (caregiverNetworkHeading !== undefined) updateData.caregiverNetworkHeading = caregiverNetworkHeading;
    if (caregiverNetworkDescription !== undefined) updateData.caregiverNetworkDescription = caregiverNetworkDescription;
    if (caregiverNetworkImage !== undefined) updateData.caregiverNetworkImage = caregiverNetworkImage;

    const updatedWhoWeAre = await db
      .update(WhoWeAreModel)
      .set(updateData)
      .where(eq(WhoWeAreModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Caregiver Network section updated successfully",
      data: {
        whoWeAre: updatedWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Update caregiver network section error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updatePromiseSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { promiseHeading, promiseDescription } = req.body;

    const existingWhoWeAre = await db.query.WhoWeAreModel.findFirst({
      where: eq(WhoWeAreModel.id, id),
    });

    if (!existingWhoWeAre) {
      return res.status(404).json({
        success: false,
        message: "Who We Are page not found",
      });
    }

    const updateData: any = { updatedAt: new Date() };
    if (promiseHeading !== undefined) updateData.promiseHeading = promiseHeading;
    if (promiseDescription !== undefined) updateData.promiseDescription = promiseDescription;

    const updatedWhoWeAre = await db
      .update(WhoWeAreModel)
      .set(updateData)
      .where(eq(WhoWeAreModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Promise section updated successfully",
      data: {
        whoWeAre: updatedWhoWeAre[0],
      },
    });
  } catch (error) {
    console.error("Update promise section error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};