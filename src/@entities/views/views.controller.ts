import { Request, Response } from "express";
import { BadRequestError } from "../../errors";
import { ViewsModel } from "./views.model";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { UserModel } from "../user";
import { add } from "lodash";

export const addView = async (req: Request, res: Response) => {
  const { id: giverId } = req.params;
  const userId = req.user?.id;

  if (!giverId) {
    throw new BadRequestError("Giver ID is required");
  }

  const newView = await db
    .insert(ViewsModel)
    .values({
      userId,
      giverId,
    })
    .returning();

  if (!newView || newView.length === 0) {
    throw new Error("View not created");
  }

  return res.status(201).json({
    success: true,
    message: "View created successfully",
  });
};

export const getViewsByGiver = async (req: Request, res: Response) => {
  const seekers = await db
    .select({
      id: ViewsModel.id,
      userId: UserModel.id,
      avatar: UserModel.avatar,
      name: UserModel.name,
      mobile: UserModel.mobile,
      email: UserModel.email,
      address: UserModel.address,
      createdAt: ViewsModel.createdAt,
    })
    .from(ViewsModel)
    .where(eq(ViewsModel.giverId, req.user?.id))
    .innerJoin(UserModel, eq(UserModel.id, ViewsModel.userId));

  return res.status(200).json({
    success: true,
    message: "Views retrieved successfully",
    data: { seekers },
  });
};
