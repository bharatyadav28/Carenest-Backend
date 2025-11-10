import express from "express";
import {
  createAboutUs,
  getAboutUs,
  updateAboutUs,
  deleteAboutUs,
  updateKeyPeople,
  updateTeamMembers,
  updateOurValues,
  deleteTeamMember,
  deleteKeyPerson,
  deleteValue,
} from "./aboutUs.controller";
import { validateData } from "../../middlewares/validation";
import { createAboutUsSchema, updateAboutUsSchema } from "./aboutUs.model";
import { auth, isAdmin } from "../../middlewares/auth";

const aboutUsRouter = express.Router();

// Public route - anyone can view About Us page
aboutUsRouter.route("/").get(getAboutUs);

// Admin only routes
aboutUsRouter.route("/")
  .post(auth, isAdmin, validateData(createAboutUsSchema), createAboutUs);

aboutUsRouter.route("/:id")
  .put(auth, isAdmin, validateData(updateAboutUsSchema), updateAboutUs)
  .delete(auth, isAdmin, deleteAboutUs);

// Section-specific update routes
aboutUsRouter.route("/:id/key-people")
  .patch(auth, isAdmin, updateKeyPeople);

aboutUsRouter.route("/:id/team-members")
  .patch(auth, isAdmin, updateTeamMembers);

aboutUsRouter.route("/:id/our-values")
  .patch(auth, isAdmin, updateOurValues);

// Delete individual items routes
aboutUsRouter.route("/:id/team-members/:memberId")
  .delete(auth, isAdmin, deleteTeamMember);

aboutUsRouter.route("/:id/key-people/:personId")
  .delete(auth, isAdmin, deleteKeyPerson);

aboutUsRouter.route("/:id/our-values/:valueId")
  .delete(auth, isAdmin, deleteValue);

export default aboutUsRouter;