import { Request, Response } from "express";
import { TestimonialModel } from "./testimonial.model";
import { db } from "../../db";
import { eq, desc, asc } from "drizzle-orm";

export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const testimonialData = { 
      ...req.cleanBody, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newTestimonial = await db
      .insert(TestimonialModel)
      .values(testimonialData)
      .returning();

    if (newTestimonial?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Testimonial creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: {
        testimonial: newTestimonial[0],
      },
    });
  } catch (error) {
    console.error("Create testimonial error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllTestimonials = async (req: Request, res: Response) => {
  try {
    // Fetch all testimonials without sorting
    const testimonials = await db.select().from(TestimonialModel);

    return res.status(200).json({
      success: true,
      message: "Testimonials fetched successfully",
      data: {
        testimonials,
        count: testimonials.length,
      },
    });
  } catch (error) {
    console.error("Get testimonials error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getTestimonialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testimonial = await db.query.TestimonialModel.findFirst({
      where: eq(TestimonialModel.id, id),
    });

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial fetched successfully",
      data: {
        testimonial,
      },
    });
  } catch (error) {
    console.error("Get testimonial by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingTestimonial = await db.query.TestimonialModel.findFirst({
      where: eq(TestimonialModel.id, id),
    });

    if (!existingTestimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    const updatedTestimonial = await db
      .update(TestimonialModel)
      .set(updateData)
      .where(eq(TestimonialModel.id, id))
      .returning();

    if (updatedTestimonial?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Testimonial update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: {
        testimonial: updatedTestimonial[0],
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
    const { id } = req.params;

    const existingTestimonial = await db.query.TestimonialModel.findFirst({
      where: eq(TestimonialModel.id, id),
    });

    if (!existingTestimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    const deletedTestimonial = await db
      .delete(TestimonialModel)
      .where(eq(TestimonialModel.id, id))
      .returning();

    if (deletedTestimonial?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Testimonial deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
      data: {
        testimonial: deletedTestimonial[0],
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