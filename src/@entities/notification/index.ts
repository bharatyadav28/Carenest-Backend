// @entities/notification/index.ts
import notificationRouter from "./notification.routes";
import { NotificationModel } from "./notification.model";
import { createNotification, getUserNotifications, markAsRead, getUnreadCount } from "./notification.service";

export { 
  notificationRouter, 
  NotificationModel, 
  createNotification,
  getUserNotifications,
  markAsRead,
  getUnreadCount
};