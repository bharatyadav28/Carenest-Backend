import { Request, Response } from "express";
import { FooterModel } from "./footer.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const createFooter = async (req: Request, res: Response) => {
  try {
    const footerData = { 
      ...req.cleanBody,
      socialLinks: req.cleanBody.socialLinks?.map((link: any) => ({
        ...link,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const existingFooter = await db.query.FooterModel.findFirst();

    if (existingFooter) {
      return res.status(400).json({
        success: false,
        message: "Footer already exists. Use update instead.",
      });
    }

    const newFooter = await db
      .insert(FooterModel)
      .values(footerData)
      .returning();

    if (newFooter?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Footer creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Footer created successfully",
      data: {
        footer: newFooter[0],
      },
    });
  } catch (error) {
    console.error("Create footer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getFooter = async (req: Request, res: Response) => {
  try {
    const footer = await db.query.FooterModel.findFirst();

    if (!footer) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    // Ensure arrays are always returned (not null)
    const formattedFooter = {
      ...footer,
      locations: footer.locations || [],
      socialLinks: footer.socialLinks || [],
    };

    return res.status(200).json({
      success: true,
      message: "Footer fetched successfully",
      data: {
        footer: formattedFooter,
      },
    });
  } catch (error) {
    console.error("Get footer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateFooter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    // Generate IDs for new social links if array is being updated
    if (updateData.socialLinks) {
      updateData.socialLinks = updateData.socialLinks.map((link: any) => ({
        ...link,
        id: link.id || nanoid(21)
      }));
    }

    const updatedFooter = await db
      .update(FooterModel)
      .set(updateData)
      .where(eq(FooterModel.id, id))
      .returning();

    if (updatedFooter?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Footer update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Footer updated successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Update footer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteFooter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const deletedFooter = await db
      .delete(FooterModel)
      .where(eq(FooterModel.id, id))
      .returning();

    if (deletedFooter?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Footer deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Footer deleted successfully",
      data: {
        footer: deletedFooter[0],
      },
    });
  } catch (error) {
    console.error("Delete footer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Location Management
export const addLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const updatedLocations = [
      ...(existingFooter.locations || []),
      location
    ];

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        locations: updatedLocations,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Location added successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Add location error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { oldLocation, newLocation } = req.body;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const locations = existingFooter.locations || [];
    const locationIndex = locations.findIndex((loc: string) => loc === oldLocation);

    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    locations[locationIndex] = newLocation;

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        locations,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Update location error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const updatedLocations = (existingFooter.locations || []).filter(
      (loc: string) => loc !== location
    );

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        locations: updatedLocations,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Location deleted successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Delete location error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Social Links Management
export const addSocialLink = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newLink = { ...req.cleanBody, id: nanoid(21) };

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const updatedSocialLinks = [
      ...(existingFooter.socialLinks || []),
      newLink
    ];

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        socialLinks: updatedSocialLinks,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Social link added successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Add social link error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateSocialLink = async (req: Request, res: Response) => {
  try {
    const { id, linkId } = req.params;
    const updatedLinkData = req.cleanBody;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const socialLinks = existingFooter.socialLinks || [];
    const linkIndex = socialLinks.findIndex((link: any) => link.id === linkId);

    if (linkIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Social link not found",
      });
    }

    socialLinks[linkIndex] = {
      ...socialLinks[linkIndex],
      ...updatedLinkData
    };

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        socialLinks,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Social link updated successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Update social link error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteSocialLink = async (req: Request, res: Response) => {
  try {
    const { id, linkId } = req.params;

    const existingFooter = await db.query.FooterModel.findFirst({
      where: eq(FooterModel.id, id),
    });

    if (!existingFooter) {
      return res.status(404).json({
        success: false,
        message: "Footer not found",
      });
    }

    const updatedSocialLinks = (existingFooter.socialLinks || []).filter(
      (link: any) => link.id !== linkId
    );

    const updatedFooter = await db
      .update(FooterModel)
      .set({ 
        socialLinks: updatedSocialLinks,
        updatedAt: new Date() 
      })
      .where(eq(FooterModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Social link deleted successfully",
      data: {
        footer: updatedFooter[0],
      },
    });
  } catch (error) {
    console.error("Delete social link error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};