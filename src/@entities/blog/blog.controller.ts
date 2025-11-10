import { Request, Response } from "express";
import { BlogModel } from "./blog.model";
import { db } from "../../db";
import { eq, desc, asc, sql } from "drizzle-orm";

export const createBlog = async (req: Request, res: Response) => {
  try {
    const blogData = { 
      ...req.cleanBody, 
      blogDate: new Date(req.cleanBody.blogDate),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newBlog = await db
      .insert(BlogModel)
      .values(blogData)
      .returning();

    if (newBlog?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Blog creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: {
        blog: newBlog[0],
      },
    });
  } catch (error) {
    console.error("Create blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const { 
      sort_by = "createdAt", 
      order = "desc",
      page = "1",
      limit = "10"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Apply sorting
    const orderBy = order === "asc" ? asc : desc;
    let sortColumn;
    switch (sort_by) {
      case "blogDate":
        sortColumn = BlogModel.blogDate;
        break;
      case "title":
        sortColumn = BlogModel.title;
        break;
      case "createdAt":
      default:
        sortColumn = BlogModel.createdAt;
    }

    const blogs = await db
      .select()
      .from(BlogModel)
      .orderBy(orderBy(sortColumn))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(BlogModel);
    const total = totalResult[0].count;

    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      data: {
        blogs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const blog = await db.query.BlogModel.findFirst({
      where: eq(BlogModel.id, id),
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: {
        blog,
      },
    });
  } catch (error) {
    console.error("Get blog by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getRecentBlogs = async (req: Request, res: Response) => {
  try {
    const { limit = "5" } = req.query;
    const limitNum = parseInt(limit as string);

    const blogs = await db
      .select()
      .from(BlogModel)
      .orderBy(desc(BlogModel.blogDate), desc(BlogModel.createdAt))
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: "Recent blogs fetched successfully",
      data: {
        blogs,
        count: blogs.length,
      },
    });
  } catch (error) {
    console.error("Get recent blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { 
      ...req.cleanBody, 
      updatedAt: new Date() 
    };

    // Convert blogDate if it's being updated
    if (updateData.blogDate) {
      updateData.blogDate = new Date(updateData.blogDate);
    }

    const existingBlog = await db.query.BlogModel.findFirst({
      where: eq(BlogModel.id, id),
    });

    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const updatedBlog = await db
      .update(BlogModel)
      .set(updateData)
      .where(eq(BlogModel.id, id))
      .returning();

    if (updatedBlog?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Blog update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: {
        blog: updatedBlog[0],
      },
    });
  } catch (error) {
    console.error("Update blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingBlog = await db.query.BlogModel.findFirst({
      where: eq(BlogModel.id, id),
    });

    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const deletedBlog = await db
      .delete(BlogModel)
      .where(eq(BlogModel.id, id))
      .returning();

    if (deletedBlog?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Blog deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: {
        blog: deletedBlog[0],
      },
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};