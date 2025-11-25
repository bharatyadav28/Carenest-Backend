import { Request, Response } from "express";
import { BecomeCaregiverModel, createBecomeCaregiverSchema, updateBecomeCaregiverSchema, addPointSchema, addTestimonialSchema } from "./becomeCaregiver.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Admin: Create Become Caregiver page
export const createBecomeCaregiver = async (req: Request, res: Response) => {
  try {
    const becomeCaregiverData = { 
      ...req.cleanBody,
      points: req.cleanBody.points?.map((point: any) => ({
        ...point,
        id: nanoid(21)
      })),
      testimonials: req.cleanBody.testimonials?.map((testimonial: any) => ({
        ...testimonial,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst();

    if (existingBecomeCaregiver) {
      return res.status(400).json({
        success: false,
        message: "Become Caregiver page already exists. Use update instead.",
      });
    }

    const newBecomeCaregiver = await db
      .insert(BecomeCaregiverModel)
      .values(becomeCaregiverData)
      .returning();

    if (newBecomeCaregiver?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Become Caregiver page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Become Caregiver page created successfully",
      data: {
        becomeCaregiver: newBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Create become caregiver page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get Become Caregiver page
export const getBecomeCaregiver = async (req: Request, res: Response) => {
  try {
    const becomeCaregiver = await db.query.BecomeCaregiverModel.findFirst();

    if (!becomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    // Ensure arrays are always returned (not null)
    const formattedBecomeCaregiver = {
      ...becomeCaregiver,
      points: becomeCaregiver.points || [],
      testimonials: becomeCaregiver.testimonials || [],
    };

    return res.status(200).json({
      success: true,
      message: "Become Caregiver page fetched successfully",
      data: {
        becomeCaregiver: formattedBecomeCaregiver,
      },
    });
  } catch (error) {
    console.error("Get become caregiver page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update Become Caregiver page
export const updateBecomeCaregiver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    // Validate that points array always has exactly 6 items when being updated
    if (updateData.points && updateData.points.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Exactly 6 points are required",
      });
    }

    // Generate IDs for new points and testimonials if arrays are being updated
    if (updateData.points) {
      updateData.points = updateData.points.map((point: any) => ({
        ...point,
        id: point.id || nanoid(21)
      }));
    }

    if (updateData.testimonials) {
      updateData.testimonials = updateData.testimonials.map((testimonial: any) => ({
        ...testimonial,
        id: testimonial.id || nanoid(21)
      }));
    }

    const updatedBecomeCaregiver = await db
      .update(BecomeCaregiverModel)
      .set(updateData)
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    if (updatedBecomeCaregiver?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Become Caregiver page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Become Caregiver page updated successfully",
      data: {
        becomeCaregiver: updatedBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Update become caregiver page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete Become Caregiver page
export const deleteBecomeCaregiver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    const deletedBecomeCaregiver = await db
      .delete(BecomeCaregiverModel)
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    if (deletedBecomeCaregiver?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Become Caregiver page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Become Caregiver page deleted successfully",
      data: {
        becomeCaregiver: deletedBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Delete become caregiver page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Points Management
export const updatePoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    if (points.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Exactly 6 points are required",
      });
    }

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    const updatedPoints = points.map((point: any) => ({
      ...point,
      id: point.id || nanoid(21)
    }));

    const updatedBecomeCaregiver = await db
      .update(BecomeCaregiverModel)
      .set({ 
        points: updatedPoints,
        updatedAt: new Date() 
      })
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Points updated successfully",
      data: {
        becomeCaregiver: updatedBecomeCaregiver[0],
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

// Testimonials Management
export const addTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newTestimonial = { ...req.cleanBody, id: nanoid(21) };

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    const updatedTestimonials = [
      ...(existingBecomeCaregiver.testimonials || []),
      newTestimonial
    ];

    const updatedBecomeCaregiver = await db
      .update(BecomeCaregiverModel)
      .set({ 
        testimonials: updatedTestimonials,
        updatedAt: new Date() 
      })
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Testimonial added successfully",
      data: {
        becomeCaregiver: updatedBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Add testimonial error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const { id, testimonialId } = req.params;
    const updatedTestimonialData = req.cleanBody;

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    const testimonials = existingBecomeCaregiver.testimonials || [];
    const testimonialIndex = testimonials.findIndex((testimonial: any) => testimonial.id === testimonialId);

    if (testimonialIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonials[testimonialIndex] = {
      ...testimonials[testimonialIndex],
      ...updatedTestimonialData
    };

    const updatedBecomeCaregiver = await db
      .update(BecomeCaregiverModel)
      .set({ 
        testimonials,
        updatedAt: new Date() 
      })
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: {
        becomeCaregiver: updatedBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Update testimonial error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id, testimonialId } = req.params;

    const existingBecomeCaregiver = await db.query.BecomeCaregiverModel.findFirst({
      where: eq(BecomeCaregiverModel.id, id),
    });

    if (!existingBecomeCaregiver) {
      return res.status(404).json({
        success: false,
        message: "Become Caregiver page not found",
      });
    }

    const updatedTestimonials = (existingBecomeCaregiver.testimonials || []).filter(
      (testimonial: any) => testimonial.id !== testimonialId
    );

    const updatedBecomeCaregiver = await db
      .update(BecomeCaregiverModel)
      .set({ 
        testimonials: updatedTestimonials,
        updatedAt: new Date() 
      })
      .where(eq(BecomeCaregiverModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
      data: {
        becomeCaregiver: updatedBecomeCaregiver[0],
      },
    });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};