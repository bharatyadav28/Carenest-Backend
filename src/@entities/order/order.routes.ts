import express from "express";
import { createStripeSession } from "./order.controller";
import { isGiver } from "../../middlewares/auth";

const orderRouter = express.Router();

orderRouter.post("/create-checkout-session", isGiver, createStripeSession);

export default orderRouter;
