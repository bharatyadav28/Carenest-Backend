import { Request, Response } from "express";
import { LocationServicesModel, createLocationServiceSchema, updateLocationServiceSchema, serviceInputSchema } from "./locationServices.model";
import { db } from "../../db";
import { eq, asc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Admin: Create location service page
export const createLocationService = async (req: Request, res: Response) => {
  try {
    const locationServiceData = { 
      ...req.cleanBody,
      services: req.cleanBody.services?.map((service: any) => ({
        ...service,
        id: nanoid(21)
      })),
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    // Check if location already exists
    const existingLocation = await db.query.LocationServicesModel.findFirst({
      where: and(
        eq(LocationServicesModel.city, locationServiceData.city),
        eq(LocationServicesModel.state, locationServiceData.state)
      ),
    });

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: `Location service page for ${locationServiceData.city}, ${locationServiceData.state} already exists. Use update instead.`,
      });
    }

    const newLocationService = await db
      .insert(LocationServicesModel)
      .values(locationServiceData)
      .returning();

    if (newLocationService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Location service page creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Location service page created successfully",
      data: {
        locationService: newLocationService[0],
      },
    });
  } catch (error) {
    console.error("Create location service page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get all location services
export const getAllLocationServices = async (req: Request, res: Response) => {
  try {
    const locationServices = await db
      .select()
      .from(LocationServicesModel)
      .orderBy(asc(LocationServicesModel.city));

    // Ensure services arrays are always returned (not null)
    const formattedLocationServices = locationServices.map(service => ({
      ...service,
      services: service.services || [],
    }));

    return res.status(200).json({
      success: true,
      message: "Location services fetched successfully",
      data: {
        locationServices: formattedLocationServices,
        count: locationServices.length,
      },
    });
  } catch (error) {
    console.error("Get all location services error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get location service by city and state
export const getLocationServiceByCityState = async (req: Request, res: Response) => {
  try {
    const { city, state } = req.params;

    const locationService = await db.query.LocationServicesModel.findFirst({
      where: and(
        eq(LocationServicesModel.city, city),
        eq(LocationServicesModel.state, state)
      ),
    });

    if (!locationService) {
      return res.status(404).json({
        success: false,
        message: `Location service page for ${city}, ${state} not found`,
      });
    }

    // Ensure services array is always returned (not null)
    const formattedLocationService = {
      ...locationService,
      services: locationService.services || [],
    };

    return res.status(200).json({
      success: true,
      message: "Location service page fetched successfully",
      data: {
        locationService: formattedLocationService,
      },
    });
  } catch (error) {
    console.error("Get location service by city/state error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get location service by ID
export const getLocationServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const locationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!locationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    // Ensure services array is always returned (not null)
    const formattedLocationService = {
      ...locationService,
      services: locationService.services || [],
    };

    return res.status(200).json({
      success: true,
      message: "Location service page fetched successfully",
      data: {
        locationService: formattedLocationService,
      },
    });
  } catch (error) {
    console.error("Get location service by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update location service
export const updateLocationService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingLocationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!existingLocationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    // Generate IDs for new services if array is being updated
    if (updateData.services) {
      updateData.services = updateData.services.map((service: any) => ({
        ...service,
        id: service.id || nanoid(21)
      }));
    }

    const updatedLocationService = await db
      .update(LocationServicesModel)
      .set(updateData)
      .where(eq(LocationServicesModel.id, id))
      .returning();

    if (updatedLocationService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Location service page update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location service page updated successfully",
      data: {
        locationService: updatedLocationService[0],
      },
    });
  } catch (error) {
    console.error("Update location service page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete location service
export const deleteLocationService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingLocationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!existingLocationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    const deletedLocationService = await db
      .delete(LocationServicesModel)
      .where(eq(LocationServicesModel.id, id))
      .returning();

    if (deletedLocationService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Location service page deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location service page deleted successfully",
      data: {
        locationService: deletedLocationService[0],
      },
    });
  } catch (error) {
    console.error("Delete location service page error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Services Management
export const addService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newService = { ...req.cleanBody, id: nanoid(21) };

    const existingLocationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!existingLocationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    const updatedServices = [
      ...(existingLocationService.services || []),
      newService
    ];

    const updatedLocationService = await db
      .update(LocationServicesModel)
      .set({ 
        services: updatedServices,
        updatedAt: new Date() 
      })
      .where(eq(LocationServicesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Service added successfully",
      data: {
        locationService: updatedLocationService[0],
      },
    });
  } catch (error) {
    console.error("Add service error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id, serviceId } = req.params;
    const updatedServiceData = req.cleanBody;

    const existingLocationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!existingLocationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    const services = existingLocationService.services || [];
    const serviceIndex = services.findIndex((service: any) => service.id === serviceId);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    services[serviceIndex] = {
      ...services[serviceIndex],
      ...updatedServiceData
    };

    const updatedLocationService = await db
      .update(LocationServicesModel)
      .set({ 
        services,
        updatedAt: new Date() 
      })
      .where(eq(LocationServicesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: {
        locationService: updatedLocationService[0],
      },
    });
  } catch (error) {
    console.error("Update service error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id, serviceId } = req.params;

    const existingLocationService = await db.query.LocationServicesModel.findFirst({
      where: eq(LocationServicesModel.id, id),
    });

    if (!existingLocationService) {
      return res.status(404).json({
        success: false,
        message: "Location service page not found",
      });
    }

    const updatedServices = (existingLocationService.services || []).filter(
      (service: any) => service.id !== serviceId
    );

    const updatedLocationService = await db
      .update(LocationServicesModel)
      .set({ 
        services: updatedServices,
        updatedAt: new Date() 
      })
      .where(eq(LocationServicesModel.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: {
        locationService: updatedLocationService[0],
      },
    });
  } catch (error) {
    console.error("Delete service error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};