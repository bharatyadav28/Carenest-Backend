import { Request, Response } from "express";
import { ResourcesModel } from "./resources.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const createResources = async (req: Request, res: Response) => {
  try {
    const resourcesData = { 
      ...req.cleanBody,
      resourceCards: req.cleanBody.resourceCards?.map((card: any) => ({
        ...card,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingResources = await db.query.ResourcesModel.findFirst();

    if (existingResources) {
      return res.status(400).json({
        success: false,
        message: "Resources page already exists. Use update instead.",
      });
    }

    const newResources = await db
      .insert(ResourcesModel)
      .values(resourcesData)
      .returning();

    if (newResources?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Resources page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Resources page created successfully",
      data: {
        resources: newResources[0],
      },
    });
  } catch (error) {
    console.error("Create resources page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getResources = async (req: Request, res: Response) => {
  try {
    const resources = await db.query.ResourcesModel.findFirst();

    if (!resources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    // Ensure resourceCards array is always returned (not null)
    const formattedResources = {
      ...resources,
      resourceCards: resources.resourceCards || [],
    };

    return res.status(200).json({
      success: true,
      message: "Resources page fetched successfully",
      data: {
        resources: formattedResources,
      },
    });
  } catch (error) {
    console.error("Get resources page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    // Generate IDs for new resource cards if array is being updated
    if (updateData.resourceCards) {
      updateData.resourceCards = updateData.resourceCards.map((card: any) => ({
        ...card,
        id: card.id || nanoid(21)
      }));
    }

    const updatedResources = await db
      .update(ResourcesModel)
      .set(updateData)
      .where(eq(ResourcesModel.id, id))
      .returning();

    if (updatedResources?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Resources page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resources page updated successfully",
      data: {
        resources: updatedResources[0],
      },
    });
  } catch (error) {
    console.error("Update resources page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    const deletedResources = await db
      .delete(ResourcesModel)
      .where(eq(ResourcesModel.id, id))
      .returning();

    if (deletedResources?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Resources page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resources page deleted successfully",
      data: {
        resources: deletedResources[0],
      },
    });
  } catch (error) {
    console.error("Delete resources page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Resource Card Management
export const addResourceCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newCard = { ...req.cleanBody, id: nanoid(21) };

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    const updatedResourceCards = [
      ...(existingResources.resourceCards || []),
      newCard
    ];

    const updatedResources = await db
      .update(ResourcesModel)
      .set({ 
        resourceCards: updatedResourceCards,
        updatedAt: new Date() 
      })
      .where(eq(ResourcesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Resource card added successfully",
      data: {
        resources: updatedResources[0],
      },
    });
  } catch (error) {
    console.error("Add resource card error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateResourceCard = async (req: Request, res: Response) => {
  try {
    const { id, cardId } = req.params;
    const updatedCardData = req.cleanBody;

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    const resourceCards = existingResources.resourceCards || [];
    const cardIndex = resourceCards.findIndex((card: any) => card.id === cardId);

    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Resource card not found",
      });
    }

    resourceCards[cardIndex] = {
      ...resourceCards[cardIndex],
      ...updatedCardData
    };

    const updatedResources = await db
      .update(ResourcesModel)
      .set({ 
        resourceCards,
        updatedAt: new Date() 
      })
      .where(eq(ResourcesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Resource card updated successfully",
      data: {
        resources: updatedResources[0],
      },
    });
  } catch (error) {
    console.error("Update resource card error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteResourceCard = async (req: Request, res: Response) => {
  try {
    const { id, cardId } = req.params;

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    const updatedResourceCards = (existingResources.resourceCards || []).filter(
      (card: any) => card.id !== cardId
    );

    const updatedResources = await db
      .update(ResourcesModel)
      .set({ 
        resourceCards: updatedResourceCards,
        updatedAt: new Date() 
      })
      .where(eq(ResourcesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Resource card deleted successfully",
      data: {
        resources: updatedResources[0],
      },
    });
  } catch (error) {
    console.error("Delete resource card error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getResourceCardById = async (req: Request, res: Response) => {
  try {
    const { id, cardId } = req.params;

    const existingResources = await db.query.ResourcesModel.findFirst({
      where: eq(ResourcesModel.id, id),
    });

    if (!existingResources) {
      return res.status(404).json({
        success: false,
        message: "Resources page not found",
      });
    }

    const resourceCard = (existingResources.resourceCards || []).find(
      (card: any) => card.id === cardId
    );

    if (!resourceCard) {
      return res.status(404).json({
        success: false,
        message: "Resource card not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resource card fetched successfully",
      data: {
        resourceCard,
      },
    });
  } catch (error) {
    console.error("Get resource card error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};