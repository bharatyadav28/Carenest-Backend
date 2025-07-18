import { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { MyServiceModel } from "./myService.model";

export const addMyService = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const serviceIds: string[] = req.body.serviceIds;

  await db.delete(MyServiceModel).where(eq(MyServiceModel.userId, userId));

  if (serviceIds && serviceIds.length > 0) {
    const toInsertData = serviceIds?.map((serviceId) => ({
      userId,
      serviceId,
    }));

    const insertResult = await db
      .insert(MyServiceModel)
      .values(toInsertData)
      .returning();

    if (insertResult.length == 0) {
      throw new Error("Failed to add services");
    }
  }

  return res.status(200).json({
    success: true,
    message: "Services added successfully",
  });
};

export const getMyServices = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const myServices = await db
    .select()
    .from(MyServiceModel)
    .where(eq(MyServiceModel.userId, userId));

  const myServiceIds = myServices.map((s) => s.serviceId);

  return res.status(200).json({
    success: true,
    message: "My services fetched successfully",
    data: { myServiceIds },
  });
};
