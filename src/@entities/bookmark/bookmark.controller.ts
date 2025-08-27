import { Request, Response } from "express";

import { db } from "../../db";
import { BookmarkModel } from "./bookmark.model";
import { and, eq, sql } from "drizzle-orm";
import { UserModel } from "../user/user.model";
import { JobProfileModel } from "../jobProfile/jobProfile.model";
import { ServiceModel } from "../service/service.model";
import { MyServiceModel } from "../myService/myService.model";

export const manageBookmark = async (req: Request, res: Response) => {
  const giverId = req.params.id;
  const userId = req.user.id;

  const bookmark = await db
    .select()
    .from(BookmarkModel)
    .where(
      and(eq(BookmarkModel.userId, userId), eq(BookmarkModel.giverId, giverId))
    );

  if (bookmark && bookmark.length > 0) {
    const deletedBookmark = await db
      .delete(BookmarkModel)
      .where(
        and(
          eq(BookmarkModel.userId, userId),
          eq(BookmarkModel.giverId, giverId)
        )
      )
      .returning();

    if (deletedBookmark && deletedBookmark.length === 0) {
      throw new Error("Failed to remove bookmark");
    }

    return res.status(200).json({
      success: true,
      message: "Bookmark removed successfully",
    });
  }

  const newBookmark = await db
    .insert(BookmarkModel)
    .values({
      userId,
      giverId,
    })
    .returning();

  return res.status(201).json({
    success: true,
    message: "Bookmark added successfully",
  });
};

export const getBookmarkedGivers = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const givers = await db
    .select({
      id: UserModel.id,
      name: UserModel.name,
      avatar: UserModel.avatar,
      experience: JobProfileModel.experienceMax,
      price: JobProfileModel.minPrice,
      services: sql<string[]>`array_agg(${ServiceModel.name})`.as("services"),
    })
    .from(BookmarkModel)
    .where(eq(BookmarkModel.userId, userId))
    .innerJoin(UserModel, eq(BookmarkModel.giverId, UserModel.id))
    .leftJoin(JobProfileModel, eq(UserModel.id, JobProfileModel.userId))
    .leftJoin(MyServiceModel, eq(UserModel.id, MyServiceModel.userId))
    .leftJoin(ServiceModel, eq(MyServiceModel.serviceId, ServiceModel.id))
    .groupBy(
      UserModel.id,
      UserModel.name,
      UserModel.avatar,
      JobProfileModel.experienceMax,
      JobProfileModel.minPrice
    );

  return res.status(200).json({
    success: true,
    message: "Bookmarked givers retrieved successfully",
    data: { givers },
  });
};
