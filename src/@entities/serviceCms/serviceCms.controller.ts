import { Request, Response } from "express";
import { ServiceCmsModel, CareType, createServiceSchema, updateServiceSchema } from "./serviceCms.model";
import { db } from "../../db";
import { eq, desc, asc, and } from "drizzle-orm";

// Admin: Create new service
export const createService = async (req: Request, res: Response) => {
  try {
    const serviceData = { 
      ...req.cleanBody,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    const newService = await db
      .insert(ServiceCmsModel)
      .values(serviceData)
      .returning();

    if (newService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Service creation failed",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: {
        service: newService[0],
      },
    });
  } catch (error) {
    console.error("Create service error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get all services for homepage (only basic info)
export const getAllServicesForHomepage = async (req: Request, res: Response) => {
  try {
    const services = await db
      .select({
        id: ServiceCmsModel.id,
        serviceName: ServiceCmsModel.serviceName,
        serviceDescription: ServiceCmsModel.serviceDescription,
        serviceIcon: ServiceCmsModel.serviceIcon,
        careType: ServiceCmsModel.careType,
      })
      .from(ServiceCmsModel)
      .orderBy(asc(ServiceCmsModel.serviceName));

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully for homepage",
      data: {
        services,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("Get services for homepage error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get service by ID (full details)
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await db.query.ServiceCmsModel.findFirst({
      where: eq(ServiceCmsModel.id, id),
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service fetched successfully",
      data: {
        service,
      },
    });
  } catch (error) {
    console.error("Get service by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Public: Get services by care type
export const getServicesByCareType = async (req: Request, res: Response) => {
  try {
    const { careType } = req.params;

    const services = await db
      .select()
      .from(ServiceCmsModel)
      .where(eq(ServiceCmsModel.careType, careType))
      .orderBy(asc(ServiceCmsModel.serviceName));

    return res.status(200).json({
      success: true,
      message: `Services for ${careType} fetched successfully`,
      data: {
        services,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("Get services by care type error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await db
      .select()
      .from(ServiceCmsModel)
      .orderBy(asc(ServiceCmsModel.serviceName));

    return res.status(200).json({
      success: true,
      message: "All services fetched successfully",
      data: {
        services,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("Get all services error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update service
export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.cleanBody, updatedAt: new Date() };

    const existingService = await db.query.ServiceCmsModel.findFirst({
      where: eq(ServiceCmsModel.id, id),
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const updatedService = await db
      .update(ServiceCmsModel)
      .set(updateData)
      .where(eq(ServiceCmsModel.id, id))
      .returning();

    if (updatedService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Service update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: {
        service: updatedService[0],
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

// Admin: Delete service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingService = await db.query.ServiceCmsModel.findFirst({
      where: eq(ServiceCmsModel.id, id),
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const deletedService = await db
      .delete(ServiceCmsModel)
      .where(eq(ServiceCmsModel.id, id))
      .returning();

    if (deletedService?.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Service deletion failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: {
        service: deletedService[0],
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