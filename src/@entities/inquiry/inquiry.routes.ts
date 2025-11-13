import express from "express";
import {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  deleteInquiry,
} from "./inquiry.controller";
import { validateData } from "../../middlewares/validation";
import { createInquirySchema } from "./inquiry.model";
import { auth, isAdmin } from "../../middlewares/auth";

const inquiryRouter = express.Router();

// Public route - anyone can submit inquiry
inquiryRouter.post("/", validateData(createInquirySchema), createInquiry);

// Admin only routes - view inquiries
inquiryRouter.get("/", auth, isAdmin, getAllInquiries);
inquiryRouter.get("/:id", auth, isAdmin, getInquiryById);
inquiryRouter.delete("/:id", auth, isAdmin, deleteInquiry);

export default inquiryRouter;