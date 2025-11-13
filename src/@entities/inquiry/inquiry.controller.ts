import { Request, Response } from "express";
import { InquiryModel } from "./inquiry.model";
import { db } from "../../db";
import { desc, eq, sql } from "drizzle-orm";

// Public: Submit inquiry form
export const createInquiry = async (req: Request, res: Response) => {
  try {
    const inquiryData = { 
      ...req.cleanBody,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newInquiry = await db
      .insert(InquiryModel)
      .values(inquiryData)
      .returning();

    if (newInquiry?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Inquiry submission failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: {
        inquiry: newInquiry[0],
      },
    });
  } catch (error) {
    console.error("Create inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all inquiries with pagination
export const getAllInquiries = async (req: Request, res: Response) => {
  try {
    const { 
      page = "1",
      limit = "10"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get inquiries with pagination
    const inquiries = await db
      .select()
      .from(InquiryModel)
      .orderBy(desc(InquiryModel.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(InquiryModel);
    const total = totalResult[0].count;

    return res.status(200).json({
      success: true,
      message: "Inquiries fetched successfully",
      data: {
        inquiries,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get inquiries error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get single inquiry by ID
export const getInquiryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await db.query.InquiryModel.findFirst({
      where: (inquiry, { eq }) => eq(inquiry.id, id),
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inquiry fetched successfully",
      data: {
        inquiry,
      },
    });
  } catch (error) {
    console.error("Get inquiry by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete inquiry
export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingInquiry = await db.query.InquiryModel.findFirst({
      where: (inquiry, { eq }) => eq(inquiry.id, id),
    });

    if (!existingInquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const deletedInquiry = await db
      .delete(InquiryModel)
      .where(eq(InquiryModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
      data: {
        inquiry: deletedInquiry[0],
      },
    });
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};