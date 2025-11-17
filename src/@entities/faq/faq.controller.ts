import { Request, Response } from "express";
import { FAQModel, createFAQSchema, updateFAQSchema, addFAQItemSchema } from "./faq.model";
import { db } from "../../db";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

// Admin: Create new FAQ
export const createFAQ = async (req: Request, res: Response) => {
  try {
    const faqData = { 
      ...req.cleanBody,
      faqItems: req.cleanBody.faqItems?.map((item: any) => ({
        ...item,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newFAQ = await db
      .insert(FAQModel)
      .values(faqData)
      .returning();

    if (newFAQ?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "FAQ creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: {
        faq: newFAQ[0],
      },
    });
  } catch (error) {
    console.error("Create FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get FAQs by type
export const getFAQsByType = async (req: Request, res: Response) => {
  try {
    const { faqType } = req.params;

    const faqs = await db
      .select()
      .from(FAQModel)
      .where(eq(FAQModel.faqType, faqType))
      .orderBy(asc(FAQModel.sectionTitle));

    return res.status(200).json({
      success: true,
      message: `FAQs for ${faqType} fetched successfully`,
      data: {
        faqs,
        count: faqs.length,
      },
    });
  } catch (error) {
    console.error("Get FAQs by type error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get all FAQs
export const getAllFAQs = async (req: Request, res: Response) => {
  try {
    const faqs = await db
      .select()
      .from(FAQModel)
      .orderBy(asc(FAQModel.faqType), asc(FAQModel.sectionTitle));

    return res.status(200).json({
      success: true,
      message: "All FAQs fetched successfully",
      data: {
        faqs,
        count: faqs.length,
      },
    });
  } catch (error) {
    console.error("Get all FAQs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get FAQ by ID
export const getFAQById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ fetched successfully",
      data: {
        faq,
      },
    });
  } catch (error) {
    console.error("Get FAQ by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update FAQ
export const updateFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingFAQ = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    // Generate IDs for new FAQ items if array is being updated
    if (updateData.faqItems) {
      updateData.faqItems = updateData.faqItems.map((item: any) => ({
        ...item,
        id: item.id || nanoid(21)
      }));
    }

    const updatedFAQ = await db
      .update(FAQModel)
      .set(updateData)
      .where(eq(FAQModel.id, id))
      .returning();

    if (updatedFAQ?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "FAQ update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: {
        faq: updatedFAQ[0],
      },
    });
  } catch (error) {
    console.error("Update FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete FAQ
export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingFAQ = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const deletedFAQ = await db
      .delete(FAQModel)
      .where(eq(FAQModel.id, id))
      .returning();

    if (deletedFAQ?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "FAQ deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
      data: {
        faq: deletedFAQ[0],
      },
    });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// FAQ Item Management
export const addFAQItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newItem = { ...req.cleanBody, id: nanoid(21) };

    const existingFAQ = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const updatedFAQItems = [
      ...(existingFAQ.faqItems || []),
      newItem
    ];

    const updatedFAQ = await db
      .update(FAQModel)
      .set({ 
        faqItems: updatedFAQItems,
        updatedAt: new Date() 
      })
      .where(eq(FAQModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "FAQ item added successfully",
      data: {
        faq: updatedFAQ[0],
      },
    });
  } catch (error) {
    console.error("Add FAQ item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateFAQItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const updatedItemData = req.cleanBody;

    const existingFAQ = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const faqItems = existingFAQ.faqItems || [];
    const itemIndex = faqItems.findIndex((item: any) => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "FAQ item not found",
      });
    }

    faqItems[itemIndex] = {
      ...faqItems[itemIndex],
      ...updatedItemData
    };

    const updatedFAQ = await db
      .update(FAQModel)
      .set({ 
        faqItems,
        updatedAt: new Date() 
      })
      .where(eq(FAQModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "FAQ item updated successfully",
      data: {
        faq: updatedFAQ[0],
      },
    });
  } catch (error) {
    console.error("Update FAQ item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteFAQItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;

    const existingFAQ = await db.query.FAQModel.findFirst({
      where: eq(FAQModel.id, id),
    });

    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const updatedFAQItems = (existingFAQ.faqItems || []).filter(
      (item: any) => item.id !== itemId
    );

    const updatedFAQ = await db
      .update(FAQModel)
      .set({ 
        faqItems: updatedFAQItems,
        updatedAt: new Date() 
      })
      .where(eq(FAQModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "FAQ item deleted successfully",
      data: {
        faq: updatedFAQ[0],
      },
    });
  } catch (error) {
    console.error("Delete FAQ item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};