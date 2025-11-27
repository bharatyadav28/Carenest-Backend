import { Request, Response } from "express";
import { CaregiverApplicationModel, createCaregiverApplicationSchema, updateApplicationStatusSchema } from "./caregiverApplication.model";
import { db } from "../../db";
import { eq, desc, asc, sql, and, or, ilike } from "drizzle-orm"; // Added or and ilike imports

// Public: Submit caregiver application
export const createCaregiverApplication = async (req: Request, res: Response) => {
  try {
    const applicationData = { 
      ...req.cleanBody,
      status: "pending",
      isReviewed: false,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newApplication = await db
      .insert(CaregiverApplicationModel)
      .values(applicationData)
      .returning();

    if (newApplication?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Application submission failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        application: newApplication[0],
      },
    });
  } catch (error) {
    console.error("Create caregiver application error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all applications with pagination and search
export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      is_reviewed, 
      search, // Added search parameter
      sort_by = "createdAt", 
      order = "desc",
      page = "1",
      limit = "10"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(CaregiverApplicationModel.status, status as string));
    }

    if (is_reviewed !== undefined) {
      conditions.push(eq(CaregiverApplicationModel.isReviewed, is_reviewed === "true"));
    }

    // Add search functionality
    if (search && search !== "") {
      const searchConditions = [
        ilike(CaregiverApplicationModel.fullName, `%${search}%`),
        ilike(CaregiverApplicationModel.email, `%${search}%`),
        ilike(CaregiverApplicationModel.phoneNumber, `%${search}%`),
      ];
      
      // If there are existing conditions, combine with AND, otherwise use OR for search
      if (conditions.length > 0) {
        conditions.push(and(...searchConditions));
      } else {
        conditions.push(or(...searchConditions));
      }
    }

    // Sorting
    const orderBy = order === "asc" ? asc : desc;
    let sortColumn;

    switch (sort_by) {
      case "fullName":
        sortColumn = CaregiverApplicationModel.fullName;
        break;
      case "email":
        sortColumn = CaregiverApplicationModel.email;
        break;
      case "status":
        sortColumn = CaregiverApplicationModel.status;
        break;
      default:
        sortColumn = CaregiverApplicationModel.createdAt;
    }

    // Build query safely using AND()
    const applications = await db
      .select()
      .from(CaregiverApplicationModel)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy(sortColumn))
      .limit(limitNum)
      .offset(offset);

    // Count query
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(CaregiverApplicationModel)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0].count;

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      data: {
        applications,
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
    console.error("Get applications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Admin: Get application by ID
export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const application = await db.query.CaregiverApplicationModel.findFirst({
      where: eq(CaregiverApplicationModel.id, id),
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application fetched successfully",
      data: {
        application,
      },
    });
  } catch (error) {
    console.error("Get application by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update application status
export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, isReviewed } = req.cleanBody;

    const existingApplication = await db.query.CaregiverApplicationModel.findFirst({
      where: eq(CaregiverApplicationModel.id, id),
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const updateData: any = { 
      updatedAt: new Date() 
    };

    if (status !== undefined) updateData.status = status;
    if (isReviewed !== undefined) updateData.isReviewed = isReviewed;

    const updatedApplication = await db
      .update(CaregiverApplicationModel)
      .set(updateData)
      .where(eq(CaregiverApplicationModel.id, id))
      .returning();

    if (updatedApplication?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Application status update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: {
        application: updatedApplication[0],
      },
    });
  } catch (error) {
    console.error("Update application status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete application
export const deleteApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingApplication = await db.query.CaregiverApplicationModel.findFirst({
      where: eq(CaregiverApplicationModel.id, id),
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const deletedApplication = await db
      .delete(CaregiverApplicationModel)
      .where(eq(CaregiverApplicationModel.id, id))
      .returning();

    if (deletedApplication?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Application deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
      data: {
        application: deletedApplication[0],
      },
    });
  } catch (error) {
    console.error("Delete application error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get application statistics for admin dashboard
export const getApplicationStats = async (req: Request, res: Response) => {
  try {
    const stats = await db
      .select({
        status: CaregiverApplicationModel.status,
        count: sql<number>`count(*)`,
      })
      .from(CaregiverApplicationModel)
      .groupBy(CaregiverApplicationModel.status);

    const totalApplications = await db
      .select({ count: sql<number>`count(*)` })
      .from(CaregiverApplicationModel);

    const pendingReview = await db
      .select({ count: sql<number>`count(*)` })
      .from(CaregiverApplicationModel)
      .where(eq(CaregiverApplicationModel.isReviewed, false));

    return res.status(200).json({
      success: true,
      message: "Application statistics fetched successfully",
      data: {
        stats: {
          total: totalApplications[0].count,
          pendingReview: pendingReview[0].count,
          byStatus: stats,
        },
      },
    });
  } catch (error) {
    console.error("Get application stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};