import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { BadRequestError } from "./errors";
import { verifyJWTToken } from "./helpers/jwt";
import { saveMessage } from "./@entities/message/message.service";

let io: SocketIOServer;
const connectedUsers = new Map();

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
    socket.on("join", () => {
      connectedUsers.set(socket.userId, socket.id);

      console.log("Connected users", connectedUsers, socket.userId, socket.id);
      console.log(`User ${socket.userId} joined`);
    });

    socket.on("send_message", async (data: any) => {
      try {
        const { toUserId, message } = data;
        const fromUserId = socket.userId;

        // Save the message to the database
        const savedMessage = await saveMessage({
          fromUserId,
          toUserId,
          message,
        });

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

    socket.on("disconnect", () => {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    });
  });
  return io;
};

export const getIO = () => io;
