import { Request, Response } from "express";
import { VeteransHomeCareModel, createVeteransHomeCareSchema, updateVeteransHomeCareSchema, updatePointsSchema } from "./veteransHomeCare.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Admin: Create Veterans Home Care page
export const createVeteransHomeCare = async (req: Request, res: Response) => {
  try {
    const veteransHomeCareData = { 
      ...req.cleanBody,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst();

    if (existingVeteransHomeCare) {
      return res.status(400).json({
        success: false,
        message: "Veterans Home Care page already exists. Use update instead.",
      });
    }

    const newVeteransHomeCare = await db
      .insert(VeteransHomeCareModel)
      .values(veteransHomeCareData)
      .returning();

    if (newVeteransHomeCare?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Veterans Home Care page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Veterans Home Care page created successfully",
      data: {
        veteransHomeCare: newVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Create veterans home care page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get Veterans Home Care page
export const getVeteransHomeCare = async (req: Request, res: Response) => {
  try {
    const veteransHomeCare = await db.query.VeteransHomeCareModel.findFirst();

    if (!veteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    // Ensure points array is always returned (not null)
    const formattedVeteransHomeCare = {
      ...veteransHomeCare,
      points: veteransHomeCare.points || [],
    };

    return res.status(200).json({
      success: true,
      message: "Veterans Home Care page fetched successfully",
      data: {
        veteransHomeCare: formattedVeteransHomeCare,
      },
    });
  } catch (error) {
    console.error("Get veterans home care page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update Veterans Home Care page
export const updateVeteransHomeCare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const updatedVeteransHomeCare = await db
      .update(VeteransHomeCareModel)
      .set(updateData)
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    if (updatedVeteransHomeCare?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Veterans Home Care page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Veterans Home Care page updated successfully",
      data: {
        veteransHomeCare: updatedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Update veterans home care page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete Veterans Home Care page
export const deleteVeteransHomeCare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const deletedVeteransHomeCare = await db
      .delete(VeteransHomeCareModel)
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    if (deletedVeteransHomeCare?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Veterans Home Care page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Veterans Home Care page deleted successfully",
      data: {
        veteransHomeCare: deletedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Delete veterans home care page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update points only
export const updatePoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const updatedVeteransHomeCare = await db
      .update(VeteransHomeCareModel)
      .set({ 
        points,
        updatedAt: new Date() 
      })
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Points updated successfully",
      data: {
        veteransHomeCare: updatedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Update points error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Add point
export const addPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { point } = req.body;

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const updatedPoints = [
      ...(existingVeteransHomeCare.points || []),
      point
    ];

    const updatedVeteransHomeCare = await db
      .update(VeteransHomeCareModel)
      .set({ 
        points: updatedPoints,
        updatedAt: new Date() 
      })
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Point added successfully",
      data: {
        veteransHomeCare: updatedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Add point error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update specific point
export const updatePoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { index, point } = req.body;

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const points = existingVeteransHomeCare.points || [];
    
    if (index < 0 || index >= points.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid point index",
      });
    }

    points[index] = point;

    const updatedVeteransHomeCare = await db
      .update(VeteransHomeCareModel)
      .set({ 
        points,
        updatedAt: new Date() 
      })
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Point updated successfully",
      data: {
        veteransHomeCare: updatedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Update point error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete specific point
export const deletePoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { index } = req.body;

    const existingVeteransHomeCare = await db.query.VeteransHomeCareModel.findFirst({
      where: eq(VeteransHomeCareModel.id, id),
    });

    if (!existingVeteransHomeCare) {
      return res.status(404).json({
        success: false,
        message: "Veterans Home Care page not found",
      });
    }

    const points = existingVeteransHomeCare.points || [];
    
    if (index < 0 || index >= points.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid point index",
      });
    }

    const updatedPoints = points.filter((_, i) => i !== index);

    const updatedVeteransHomeCare = await db
      .update(VeteransHomeCareModel)
      .set({ 
        points: updatedPoints,
        updatedAt: new Date() 
      })
      .where(eq(VeteransHomeCareModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Point deleted successfully",
      data: {
        veteransHomeCare: updatedVeteransHomeCare[0],
      },
    });
  } catch (error) {
    console.error("Delete point error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};