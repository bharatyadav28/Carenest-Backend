import express from "express";
import { auth } from "../../middlewares/auth";
import { getAllChats, getChatHistory } from "./message.controller";

const messageRouter = express.Router();

messageRouter.route("/").get(auth, getAllChats);
messageRouter.get("/:id/chat-history", auth, getChatHistory);

export default messageRouter;
