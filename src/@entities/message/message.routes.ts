import express from "express";
import { auth, isGiver } from "../../middlewares/auth";
import {
  getChatHistory,
  getUserAllChats,
  markAsRead,
} from "./message.controller";

const messageRouter = express.Router();

messageRouter.route("/user/history/:otherUserId").get(auth, getChatHistory);
messageRouter.route("/giver/history/:otherUserId").get(isGiver, getChatHistory);

messageRouter.route("/user/allChats").get(auth, getUserAllChats);
messageRouter.route("/giver/allChats").get(isGiver, getUserAllChats);

messageRouter.route("/user/read/:conversationId").put(auth, markAsRead);
messageRouter.route("/giver/read/:conversationId").put(isGiver, markAsRead);

export default messageRouter;
