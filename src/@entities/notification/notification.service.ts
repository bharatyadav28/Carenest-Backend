// @entities/notification/notification.service.ts
import { db } from "../../db";
import { NotificationModel } from "./notification.model";
import { eq, and, desc, sql } from "drizzle-orm";
import { getIO } from "../../socket";

export const createNotification = async (
  userId: string,
  title: string,
  description: string,
  type: "booking" | "user" | "system"
) => {
  const notification = await db
    .insert(NotificationModel)
    .values({
      userId,
      title,
      description,
      type,
    })
    .returning();

    console.log('Notification created:', notification[0]?.id);

  // Send real-time notification via WebSocket
  const io = getIO();
  if (io && notification[0]) {
    io.to(userId).emit("new_notification", notification[0]);
  }

  return notification[0];
};

export const getUserNotifications = async (userId: string, page: number = 1, limit: number = 20) => {
  const offset = (page - 1) * limit;
  
  const [notifications, totalResult] = await Promise.all([
    // Get notifications with pagination (latest first)
    db
      .select()
      .from(NotificationModel)
      .where(eq(NotificationModel.userId, userId))
      .orderBy(desc(NotificationModel.createdAt))
      .limit(limit)
      .offset(offset),

    // Get total count
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(NotificationModel)
      .where(eq(NotificationModel.userId, userId))
  ]);

  const total = Number(totalResult[0]?.count || 0);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const [notification] = await db
    .update(NotificationModel)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(NotificationModel.id, notificationId),
        eq(NotificationModel.userId, userId)
      )
    )
    .returning();

  return notification;
};

export const getUnreadCount = async (userId: string) => {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(NotificationModel)
    .where(
      and(
        eq(NotificationModel.userId, userId),
        eq(NotificationModel.isRead, false)
      )
    );

  return Number(result?.count || 0);
};