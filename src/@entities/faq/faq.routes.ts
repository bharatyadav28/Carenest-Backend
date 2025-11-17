import express from "express";
import {
  createFAQ,
  getFAQsByType,
  getAllFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  addFAQItem,
  updateFAQItem,
  deleteFAQItem,
} from "./faq.controller";
import { validateData } from "../../middlewares/validation";
import { createFAQSchema, updateFAQSchema, addFAQItemSchema } from "./faq.model";
import { auth, isAdmin } from "../../middlewares/auth";

const faqRouter = express.Router();

// Public routes
faqRouter.get("/", getAllFAQs);
faqRouter.get("/type/:faqType", getFAQsByType);
faqRouter.get("/:id", getFAQById);

// Admin only routes
faqRouter.post("/", auth, isAdmin, validateData(createFAQSchema), createFAQ);
faqRouter.put("/:id", auth, isAdmin, validateData(updateFAQSchema), updateFAQ);
faqRouter.delete("/:id", auth, isAdmin, deleteFAQ);

// FAQ item management routes
faqRouter.post("/:id/items", auth, isAdmin, validateData(addFAQItemSchema), addFAQItem);
faqRouter.put("/:id/items/:itemId", auth, isAdmin, validateData(addFAQItemSchema), updateFAQItem);
faqRouter.delete("/:id/items/:itemId", auth, isAdmin, deleteFAQItem);

export default faqRouter;