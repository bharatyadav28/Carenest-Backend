import { Request, Response } from "express";
import { ContactModel } from "./contact.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export const createContact = async (req: Request, res: Response) => {
  try {
    const contactData = { 
      ...req.cleanBody, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingContact = await db.query.ContactModel.findFirst();

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: "Contact page already exists. Use update instead.",
      });
    }

    const newContact = await db
      .insert(ContactModel)
      .values(contactData)
      .returning();

    if (newContact?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Contact page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Contact page created successfully",
      data: {
        contact: newContact[0],
      },
    });
  } catch (error) {
    console.error("Create contact page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getContact = async (req: Request, res: Response) => {
  try {
    const contact = await db.query.ContactModel.findFirst();

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact page not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact page fetched successfully",
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error("Get contact page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingContact = await db.query.ContactModel.findFirst({
      where: eq(ContactModel.id, id),
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: "Contact page not found",
      });
    }

    const updatedContact = await db
      .update(ContactModel)
      .set(updateData)
      .where(eq(ContactModel.id, id))
      .returning();

    if (updatedContact?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Contact page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact page updated successfully",
      data: {
        contact: updatedContact[0],
      },
    });
  } catch (error) {
    console.error("Update contact page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingContact = await db.query.ContactModel.findFirst({
      where: eq(ContactModel.id, id),
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: "Contact page not found",
      });
    }

    const deletedContact = await db
      .delete(ContactModel)
      .where(eq(ContactModel.id, id))
      .returning();

    if (deletedContact?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Contact page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact page deleted successfully",
      data: {
        contact: deletedContact[0],
      },
    });
  } catch (error) {
    console.error("Delete contact page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};