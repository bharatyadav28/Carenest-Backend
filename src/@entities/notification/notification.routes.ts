// @entities/notification/notification.routes.ts
import express from "express";
import { auth } from "../../middlewares/auth";
import {
  getNotifications,
  markNotificationAsRead,
  getNotificationCount,
} from "./notification.controller";

const notificationRouter = express.Router();

// All routes require authentication
notificationRouter.use(auth);

// GET /api/v1/notifications - Get paginated notifications (latest first)
notificationRouter.get("/", getNotifications);

// GET /api/v1/notifications/count - Get unread count
notificationRouter.get("/count", getNotificationCount);

// PUT /api/v1/notifications/:notificationId/read - Mark single notification as read
notificationRouter.put("/:notificationId/read", markNotificationAsRead);

export default notificationRouter;