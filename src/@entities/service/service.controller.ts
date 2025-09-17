import { Request, Response } from "express";
import { ServiceModel } from "./service.model";
import { db } from "../../db";
import { NotFoundError } from "../../errors";
import { getURLPath } from "../../helpers/utils";
import { and, asc, eq } from "drizzle-orm";

export const addService = async (req: Request, res: Response) => {
  const serviceData = req.cleanBody;

  const updatedData = {
    ...serviceData,
    image: getURLPath(serviceData.image),
    icon: getURLPath(serviceData.icon),
  };

  const service = await db.insert(ServiceModel).values(updatedData).returning();
  if (!service || service.length === 0) {
    throw new Error("Failed to add service");
  }

  return res.status(201).json({
    success: true,
    message: "Service added successfully",
  });
};

export const updateService = async (req: Request, res: Response) => {
  const serviceData = req.cleanBody;
  const serviceId = req.params.id;

  const updatedData = {
    ...serviceData,
    image: getURLPath(serviceData.image),
    icon: getURLPath(serviceData.icon),
  };

  const updatedService = await db
    .update(ServiceModel)
    .set(updatedData)
    .where(eq(ServiceModel.id, serviceId))
    .returning();
  if (!updatedService || updatedService.length === 0) {
    throw new Error("Failed to update service");
  }

  return res.status(200).json({
    success: true,
    message: "Service updated successfully",
  });
};

export const deleteService = async (req: Request, res: Response) => {
  const { id } = req.params;
  const now = new Date();

  const deletedService = await db
    .update(ServiceModel)
    .set({ isDeleted: true, deletedAt: now, updatedAt: now })
    .where(eq(ServiceModel.id, id))
    .returning();

  if (!deletedService || deletedService.length === 0) {
    throw new Error("Failed to delete service");
  }

  return res.status(200).json({
    success: true,
    message: "Service deleted successfully",
  });
};

export const getServices = async (req: Request, res: Response) => {
  const services = await db
    .select({
      id: ServiceModel.id,
      name: ServiceModel.name,
      description: ServiceModel.description,
    })
    .from(ServiceModel)
    .where(eq(ServiceModel.isDeleted, false))
    .orderBy(asc(ServiceModel.createdAt));

  if (!services || services.length === 0) {
    throw new NotFoundError("No services found");
  }

  return res.status(200).json({
    success: true,
    messages: "Services retrieved successfully",
    data: { services },
  });
};

export const getServiceById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const service = await db
    .select({
      id: ServiceModel.id,
      name: ServiceModel.name,
      description: ServiceModel.description,
      image: ServiceModel.image,
      icon: ServiceModel.icon,
      highlight: ServiceModel.highlight,
      offerings: ServiceModel.offerings,
      targetAudience: ServiceModel.targetAudience,
    })
    .from(ServiceModel)
    .where(and(eq(ServiceModel.id, id), eq(ServiceModel.isDeleted, false)))
    .limit(1);

  if (!service || service.length === 0) {
    throw new NotFoundError("Service not found");
  }

  return res.status(200).json({
    success: true,
    message: "Service retrieved successfully",
    data: { service: service[0] },
  });
};

export const getServicesName = async (req: Request, res: Response) => {
  const services = await db
    .select({ id: ServiceModel.id, name: ServiceModel.name })
    .from(ServiceModel)
    .where(eq(ServiceModel.isDeleted, false));

  if (!services || services.length === 0) {
    throw new NotFoundError("No services found");
  }

  return res.status(200).json({
    success: true,
    messages: "Services retrieved successfully",
    data: { services },
  });
};

export const getServicesHighlight = async (req: Request, res: Response) => {
  const services = await db
    .select({
      id: ServiceModel.id,
      name: ServiceModel.name,
      highlight: ServiceModel.highlight,
      icon: ServiceModel.icon,
    })
    .from(ServiceModel)
    .where(eq(ServiceModel.isDeleted, false));

  if (!services || services.length === 0) {
    throw new NotFoundError("No services found");
  }

  return res.status(200).json({
    success: true,
    messages: "Services retrieved successfully",
    data: { services },
  });
};
