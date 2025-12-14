import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { BadRequestError } from "./errors";
import { verifyJWTToken } from "./helpers/jwt";
import { saveMessage } from "./@entities/message/message.service";
import { db } from "./db";
import { MessageModel } from "./db/schema";
import { and, eq, ne } from "drizzle-orm";

let io: SocketIOServer;
const connectedUsers = new Map(); // For chat functionality
const userRooms = new Set(); // For notification rooms

export const setUpSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authenticate socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("No token provided"));
      }

      const payload = verifyJWTToken(token, "access");
      socket.userId = (payload as any)?.user.id;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Set up user's personal room for notifications
    socket.join(`user_${socket.userId}`);
    userRooms.add(`user_${socket.userId}`);
    
    // Handle user joining for chat
    socket.on("join", () => {
      connectedUsers.set(socket.userId, socket.id);
      console.log("Connected users", connectedUsers, socket.userId, socket.id);
      console.log(`User ${socket.userId} joined`);
    });

    // Notification subscription
    socket.on("subscribe_notifications", () => {
      console.log(`User ${socket.userId} subscribed to notifications`);
      socket.emit("notification_subscribed", { success: true });
    });

    // Chat: Send message
    socket.on("send_message", async (data: any) => {
      try {
        const { toUserId, message } = data;
        const fromUserId = socket.userId;

        const savedMessage = await saveMessage(fromUserId, toUserId, message);

        console.log("Saved message:", savedMessage);

        const recipientSocketId = connectedUsers.get(toUserId);
        const messageData = {
          id: savedMessage.id,
          fromUserId: fromUserId,
          toUserId: toUserId,
          message: message,
          createdAt: savedMessage.createdAt,
          isRead: false,
        };

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("new_message", messageData);
        }

        socket.emit("message_sent", {
          success: true,
          message: messageData,
        });
      } catch (error) {
        console.log(":Error", error);
        socket.emit("message_error", {
          success: false,
          error: "Failed to send message",
        });
      }
    });

    // Chat: Mark messages as read
    socket.on("mark_messages_read", async (data: any) => {
      try {
        const { conversationId } = data;
        const userId = socket.userId;

        await db
          .update(MessageModel)
          .set({
            hasRead: true,
            readAt: new Date(),
          })
          .where(
            and(
              eq(MessageModel.conversationId, conversationId),
              ne(MessageModel.fromUserId, userId),
              eq(MessageModel.hasRead, false)
            )
          );
      } catch (error) {
        console.log(":Error", error);
      }
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(socket.userId);
      userRooms.delete(`user_${socket.userId}`);
      socket.leave(`user_${socket.userId}`);
      console.log(`User ${socket.userId} disconnected`);
    });
  });
  
  return io;
};

export const getIO = () => io;

// Notification function to send notification to specific user
export const sendNotificationToUser = (userId: string, notification: any) => {
  if (io) {
    io.to(`user_${userId}`).emit("new_notification", notification);
  }
};