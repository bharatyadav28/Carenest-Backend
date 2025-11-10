import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  getRecentBlogs,
  updateBlog,
  deleteBlog,
} from "./blog.controller";
import { validateData } from "../../middlewares/validation";
import { createBlogSchema, updateBlogSchema } from "./blog.model";
import { auth, isAdmin } from "../../middlewares/auth";

const blogRouter = express.Router();

// Public routes
blogRouter.route("/").get(getAllBlogs);
blogRouter.route("/recent").get(getRecentBlogs);
blogRouter.route("/:id").get(getBlogById);

// Admin only routes
blogRouter.route("/")
  .post(auth, isAdmin, validateData(createBlogSchema), createBlog);

blogRouter.route("/:id")
  .put(auth, isAdmin, validateData(updateBlogSchema), updateBlog)
  .delete(auth, isAdmin, deleteBlog);

export default blogRouter;