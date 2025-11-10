import { Request, Response } from "express";
import { AboutUsModel } from "./aboutUs.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const createAboutUs = async (req: Request, res: Response) => {
  try {
    // Generate IDs for nested objects
    const aboutData = { 
      ...req.cleanBody,
      keyPeople: req.cleanBody.keyPeople?.map((person: any) => ({
        ...person,
        id: nanoid(21)
      })),
      ourValues: req.cleanBody.ourValues?.map((value: any) => ({
        ...value,
        id: nanoid(21)
      })),
      teamMembers: req.cleanBody.teamMembers?.map((member: any) => ({
        ...member,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingAboutUs = await db.query.AboutUsModel.findFirst();

    if (existingAboutUs) {
      return res.status(400).json({
        success: false,
        message: "About Us page already exists. Use update instead.",
      });
    }

    const newAboutUs = await db
      .insert(AboutUsModel)
      .values(aboutData)
      .returning();

    if (newAboutUs?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "About Us page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "About Us page created successfully",
      data: {
        aboutUs: newAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Create About Us page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAboutUs = async (req: Request, res: Response) => {
  try {
    const aboutUs = await db.query.AboutUsModel.findFirst();

    if (!aboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "About Us page fetched successfully",
      data: {
        aboutUs,
      },
    });
  } catch (error) {
    console.error("Get About Us page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateAboutUs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    // Generate IDs for new nested objects if arrays are being updated
    if (updateData.keyPeople) {
      updateData.keyPeople = updateData.keyPeople.map((person: any) => ({
        ...person,
        id: person.id || nanoid(21)
      }));
    }
    if (updateData.ourValues) {
      updateData.ourValues = updateData.ourValues.map((value: any) => ({
        ...value,
        id: value.id || nanoid(21)
      }));
    }
    if (updateData.teamMembers) {
      updateData.teamMembers = updateData.teamMembers.map((member: any) => ({
        ...member,
        id: member.id || nanoid(21)
      }));
    }

    // Merge existing data with update data for arrays to allow partial updates
    const mergedData = {
      ...updateData,
      keyPeople: updateData.keyPeople !== undefined ? updateData.keyPeople : existingAboutUs.keyPeople,
      ourValues: updateData.ourValues !== undefined ? updateData.ourValues : existingAboutUs.ourValues,
      teamMembers: updateData.teamMembers !== undefined ? updateData.teamMembers : existingAboutUs.teamMembers,
    };

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set(mergedData)
      .where(eq(AboutUsModel.id, id))
      .returning();

    if (updatedAboutUs?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "About Us page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "About Us page updated successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Update About Us page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteAboutUs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const deletedAboutUs = await db
      .delete(AboutUsModel)
      .where(eq(AboutUsModel.id, id))
      .returning();

    if (deletedAboutUs?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "About Us page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "About Us page deleted successfully",
      data: {
        aboutUs: deletedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Delete About Us page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper endpoints for managing specific sections
export const updateKeyPeople = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { keyPeople } = req.body;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        keyPeople: keyPeople.map((person: any) => ({
          ...person,
          id: person.id || nanoid(21)
        })),
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Key people updated successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Update key people error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateTeamMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamMembers } = req.body;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        teamMembers: teamMembers.map((member: any) => ({
          ...member,
          id: member.id || nanoid(21)
        })),
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Team members updated successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Update team members error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateOurValues = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ourValues } = req.body;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        ourValues: ourValues.map((value: any) => ({
          ...value,
          id: value.id || nanoid(21)
        })),
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Our values updated successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Update our values error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete individual items
export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedTeamMembers = existingAboutUs.teamMembers?.filter(
      (member: any) => member.id !== memberId
    ) || [];

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        teamMembers: updatedTeamMembers,
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Delete team member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteKeyPerson = async (req: Request, res: Response) => {
  try {
    const { id, personId } = req.params;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedKeyPeople = existingAboutUs.keyPeople?.filter(
      (person: any) => person.id !== personId
    ) || [];

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        keyPeople: updatedKeyPeople,
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Key person deleted successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Delete key person error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteValue = async (req: Request, res: Response) => {
  try {
    const { id, valueId } = req.params;

    const existingAboutUs = await db.query.AboutUsModel.findFirst({
      where: eq(AboutUsModel.id, id),
    });

    if (!existingAboutUs) {
      return res.status(404).json({
        success: false,
        message: "About Us page not found",
      });
    }

    const updatedValues = existingAboutUs.ourValues?.filter(
      (value: any) => value.id !== valueId
    ) || [];

    const updatedAboutUs = await db
      .update(AboutUsModel)
      .set({ 
        ourValues: updatedValues,
        updatedAt: new Date() 
      })
      .where(eq(AboutUsModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Value deleted successfully",
      data: {
        aboutUs: updatedAboutUs[0],
      },
    });
  } catch (error) {
    console.error("Delete value error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};