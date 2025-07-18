import { Request, Response } from "express";
import { ServiceModel } from "./service.model";
import { db } from "../../db";
import { NotFoundError } from "../../errors";

export const addService = async (req: Request, res: Response) => {
  const serviceData = req.cleanBody;

  const service = await db.insert(ServiceModel).values(serviceData).returning();
  if (!service || service.length === 0) {
    throw new Error("Failed to add service");
  }

  return res.status(201).json({
    success: true,
    message: "Service added successfully",
  });
};

export const getServices = async (req: Request, res: Response) => {
  const services = await db.select().from(ServiceModel);
  if (!services || services.length === 0) {
    throw new NotFoundError("No services found");
  }

  return res.status(200).json({
    success: true,
    messages: "Services retrieved successfully",
    data: { services },
  });
};

export const getServicesName = async (req: Request, res: Response) => {
  const services = await db
    .select({ id: ServiceModel.id, name: ServiceModel.name })
    .from(ServiceModel);
  if (!services || services.length === 0) {
    throw new NotFoundError("No services found");
  }

  return res.status(200).json({
    success: true,
    messages: "Services retrieved successfully",
    data: { services },
  });
};
