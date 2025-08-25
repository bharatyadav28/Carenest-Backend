import express from "express";
import { auth, isGiver } from "../../middlewares/auth";
import {} from "./message.controller";

const messageRouter = express.Router();

export default messageRouter;
