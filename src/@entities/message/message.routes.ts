import express from "express";
import { auth, isGiver } from "../../middlewares/auth";

const messageRouter = express.Router();

export default messageRouter;
