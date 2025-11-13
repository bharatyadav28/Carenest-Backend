import express from "express";
import {
  createContact,
  getContact,
  updateContact,
  deleteContact,
} from "./contact.controller";
import { validateData } from "../../middlewares/validation";
import { createContactSchema, updateContactSchema } from "./contact.model";
import { auth, isAdmin } from "../../middlewares/auth";

const contactRouter = express.Router();

// Public route - anyone can view contact info
contactRouter.get("/", getContact);

// Admin only routes
contactRouter.post("/", auth, isAdmin, validateData(createContactSchema), createContact);
contactRouter.put("/:id", auth, isAdmin, validateData(updateContactSchema), updateContact);
contactRouter.delete("/:id", auth, isAdmin, deleteContact);

export default contactRouter;