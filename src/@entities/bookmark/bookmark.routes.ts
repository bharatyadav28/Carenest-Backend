import express from "express";
import { isSeeker } from "../../middlewares/auth";
import { manageBookmark, getBookmarkedGivers } from "./bookmark.controller";

const bookmarkRouter = express.Router();

bookmarkRouter.route("/").get(isSeeker, getBookmarkedGivers);
bookmarkRouter.route("/:id").post(isSeeker, manageBookmark);

export default bookmarkRouter;
