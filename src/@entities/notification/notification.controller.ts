// @entities/notification/notification.controller.ts
import { Request, Response } from "express";
import {
  getUserNotifications,
  markAsRead,
  getUnreadCount,
} from "./notification.service";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await getUserNotifications(userId, page, limit);

  return res.status(200).json({
    success: true,
    message: "Notifications fetched successfully",
    data: result,
  });
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { notificationId } = req.params;

  const notification = await markAsRead(notificationId, userId);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: { notification },
  });
};

export const getNotificationCount = async (req: Request, res: Response) => {
  const userId = req.user.id;

  const unreadCount = await getUnreadCount(userId);

  return res.status(200).json({
    success: true,
    message: "Notification count fetched",
    data: { unreadCount },
  });
};